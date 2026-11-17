import { supabaseClient } from "@/lib/supabaseClient";
import { specialtySlugVariants } from "@/lib/specialtySlugVariants";
import { NextResponse } from "next/server";

/* ------------------------- helpers ------------------------- */

function getAvatarUrl(
  profiles: { avatar_url?: string } | { avatar_url?: string }[] | null
): string | null {
  if (!profiles) return null;
  if (Array.isArray(profiles)) {
    return profiles[0]?.avatar_url ?? null;
  }
  return profiles.avatar_url ?? null;
}

type FeeItem = {
  fee?: number;
  type?: string;
  duration_mins?: number;
  max_attendees?: number;
  extra_fee_per_attendee?: number;
};

type AppointmentTypeMeta = {
  id: string;
  name?: string | null;
  duration_mins?: number | null;
  max_attendee?: number | null;
  platform_fee?: number | null;
  extra_fee_per_attendee?: number | null;
};

function appointmentTypesFromFees(
  fees: Record<string, FeeItem> | null | undefined,
  typeMap: Record<string, AppointmentTypeMeta>
) {
  if (!fees || typeof fees !== "object") return [];

  return Object.entries(fees).flatMap(([id, fee]) => {
    const meta = typeMap[id];
    const name = meta?.name || fee?.type;
    if (!name) return [];
    return [{
      id,
      name,
      fee: fee?.fee ?? null,
      platform_fee: meta?.platform_fee ?? null,
      duration_mins: meta?.duration_mins ?? fee?.duration_mins ?? null,
      max_attendees: meta?.max_attendee ?? fee?.max_attendees ?? null,
      extra_fee_per_attendee:
        meta?.extra_fee_per_attendee ?? fee?.extra_fee_per_attendee ?? 0,
    }];
  });
}

function calculateFeeRange(
  fees?: Record<string, FeeItem> | null
): { starting_price: number | null; ending_price: number | null } {
  if (!fees || typeof fees !== "object") {
    return { starting_price: null, ending_price: null };
  }

  const feeValues = Object.values(fees)
    .map(item => Number(item.fee))
    .filter(fee => Number.isFinite(fee) && fee > 0);

  if (feeValues.length === 0) {
    return { starting_price: null, ending_price: null };
  }

  return {
    starting_price: Math.min(...feeValues),
    ending_price: Math.max(...feeValues),
  };
}

/* ------------------------- handler ------------------------- */

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    if (!slug) {
      return NextResponse.json(
        { success: false, message: "Specialisation slug is required" },
        { status: 400 }
      );
    }

    // ✅ read sort param (?sort=asc | desc)
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get("sort"); // asc | desc | null

    // Include spelling and case variants (peadiatrician/pediatrician,
    // Cancer-specialist/cancer-specialist). Doctors are NOT filtered by
    // whether they currently have a free slot.
    const variants = specialtySlugVariants(slug);
    const practitionerSelect = `
        id,
        slug,
        full_name,
        profile_bio,
        qualification,
        fees,
        specialization,
        languages,
        experience_years,
        profiles!practitioners_profiles_fkey (
          avatar_url
        )
      `;

    // One array-overlap read instead of a query per slug variant.
    // Availability stays a follow-up query: embedding it can turn into an
    // inner join and hide doctors who have no future window.
    const { data: rows, error: queryError } = await supabaseClient
      .from("practitioners")
      .select(practitionerSelect)
      .overlaps("specialization", variants)
      .order("created_at", { ascending: false });

    if (queryError) {
      console.error("❌ Supabase query error:", queryError.message);
      return NextResponse.json(
        {
          success: false,
          message: "Database query failed",
          error: queryError.message,
        },
        { status: 500 }
      );
    }

    const data = rows || [];

    // A future published window means the doctor can still be booked.
    // This does not generate slots. The date picker stays the live check.
    // If this read fails, leave doctors bookable rather than hiding them.
    let availabilityKnown = false;
    const availableIds = new Set<string>();
    const ids = data.map((practitioner) => practitioner.id).filter(Boolean);

    const appointmentTypeMap: Record<string, AppointmentTypeMeta> = {};

    if (ids.length > 0) {
      const [windowsResult, typesResult] = await Promise.all([
        supabaseClient
          .from("practitioner_availability")
          .select("practitioner_id")
          .in("practitioner_id", ids)
          .gt("ends_at", new Date().toISOString()),
        supabaseClient
          .from("appointment_type")
          .select(
            "id, name, duration_mins, max_attendee, platform_fee, extra_fee_per_attendee"
          )
          .eq("is_active", true)
          .is("deleted_at", null),
      ]);

      if (windowsResult.error) {
        console.error("❌ Availability lookup failed:", windowsResult.error.message);
      } else {
        availabilityKnown = true;
        for (const window of windowsResult.data || []) {
          if (window.practitioner_id) availableIds.add(window.practitioner_id);
        }
      }

      if (typesResult.error) {
        console.error("❌ Appointment type lookup failed:", typesResult.error.message);
      } else {
        for (const type of typesResult.data || []) {
          appointmentTypeMap[type.id] = type;
        }
      }
    }

    /* -------- map practitioners + compute prices -------- */

    const practitioners = data.map((p) => {
      const { starting_price, ending_price } = calculateFeeRange(p.fees);

      return {
        id: p.id,
        slug: p.slug ?? null,
        full_name: p.full_name,
        profile_bio: p.profile_bio,
        qualification: p.qualification,
        profile_picture_url: getAvatarUrl(p.profiles),
        starting_price,
        ending_price,
        specialization: p.specialization,
        languages: p.languages ?? [],
        experience_years: p.experience_years,
        has_current_availability: availabilityKnown
          ? availableIds.has(p.id)
          : true,
        appointment_types: appointmentTypesFromFees(
          (p.fees ?? null) as Record<string, FeeItem> | null,
          appointmentTypeMap
        ),
      };
    });

    /* -------------------- sorting -------------------- */

    if (sort === "asc" || sort === "desc") {
      practitioners.sort((a, b) => {
        const priceA = a.starting_price ?? Number.MAX_SAFE_INTEGER;
        const priceB = b.starting_price ?? Number.MAX_SAFE_INTEGER;

        return sort === "asc"
          ? priceA - priceB
          : priceB - priceA;
      });
    }

    /* -------------------- response -------------------- */

    // Short public cache. The availability flag can be up to a minute
    // old. The per-date slot endpoint stays no-store.
    const cacheControl = availabilityKnown
      ? "public, max-age=30, s-maxage=60, stale-while-revalidate=120"
      : "private, no-store";

    return NextResponse.json(
      {
        success: true,
        count: practitioners.length,
        specialization: slug,
        sort: sort ?? null,
        practitioners,
      },
      {
        headers: {
          "Cache-Control": cacheControl,
        },
      }
    );

  } catch (err: any) {
    console.error("❌ Unexpected Server Error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
        error: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
