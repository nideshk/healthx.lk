import { supabaseClient } from "@/lib/supabaseClient";
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
};

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

    const { data, error } = await supabaseClient
      .from("practitioners")
      .select(`
        id,
        full_name,
        profile_bio,
        qualification,
        license_number,
        contact_email,
        supabase_user_id,
        fees,
        specialization,
        languages,
        profiles!practitioners_profiles_fkey (
          avatar_url
        )
      `)
      .contains("specialization", [slug])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Supabase query error:", error.message);
      return NextResponse.json(
        {
          success: false,
          message: "Database query failed",
          error: error.message,
        },
        { status: 500 }
      );
    }
    /* -------- map practitioners + compute prices -------- */

    const practitioners = (data || []).map((p) => {
      const { starting_price, ending_price } = calculateFeeRange(p.fees);

      return {
        id: p.id,
        full_name: p.full_name,
        profile_bio: p.profile_bio,
        qualification: p.qualification,
        license_number: p.license_number,
        contact_email: p.contact_email,
        profile_picture_url: getAvatarUrl(p.profiles),
        starting_price,
        ending_price,
        specialization: p.specialization,
        languages: p.languages ?? [],
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

    return NextResponse.json({
      success: true,
      count: practitioners.length,
      specialization: slug,
      sort: sort ?? null,
      practitioners,
    });

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
