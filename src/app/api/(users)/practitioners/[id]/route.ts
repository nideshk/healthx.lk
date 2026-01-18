import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Practitioner ID is required" },
        { status: 400 }
      );
    }

    const { user } = await requireUser(req);

    // ---------------------------
    // 1️⃣ Fetch Practitioner
    // ---------------------------
    const { data: practitioner, error: dbError } = await supabaseClient
      .from("practitioners")
      .select("*")
      .eq("id", id)
      .single();

    if (dbError || !practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // ---------------------------
    // 2️⃣ Resolve Appointment Types + Platform Fees
    // ---------------------------
    const feeConfig =
      practitioner.fees && typeof practitioner.fees === "object"
        ? practitioner.fees
        : {};

    const appointmentTypeIds = Object.keys(feeConfig);

    let appointmentTypeMap: Record<string, any> = {};

    if (appointmentTypeIds.length > 0) {
      const { data: appointmentTypes, error } = await supabaseClient
        .from("appointment_type")
        .select(`
          id,
          name,
          duration_mins,
          max_attendee,
          platform_fee,
          extra_fee_per_attendee
        `)
        .in("id", appointmentTypeIds)
        .eq("is_active", true)
        .is("deleted_at", null);

      if (error) {
        console.error("Failed to load appointment types:", error);
      }

      appointmentTypeMap = (appointmentTypes || []).reduce(
        (acc, at) => {
          acc[at.id] = at;
          return acc;
        },
        {} as Record<string, any>
      );
    }

    const appointmentTypes = Object.entries<any>(feeConfig).map(
      ([appointment_type_id, f]) => {
        const typeMeta = appointmentTypeMap[appointment_type_id];

        return {
          id: appointment_type_id,
          name: typeMeta?.name ?? f.type,
          fee: f.fee, // ✅ includes platform fee
          platform_fee: typeMeta?.platform_fee ?? null,
          duration_mins: typeMeta?.duration_mins ?? f.duration_mins,
          max_attendees: typeMeta?.max_attendee ?? f.max_attendees,
          extra_fee_per_attendee:
            typeMeta?.extra_fee_per_attendee ??
            f.extra_fee_per_attendee ??
            0,
        };
      }
    );

    // ---------------------------
    // 3️⃣ Admin-only Bank Details
    // ---------------------------
    let bankDetails: any[] | null = null;

    if (["admin", "superadmin"].includes(user?.role as any)) {
      const { data: bank, error: bankError } = await supabaseAdmin
        .from("practitioner_bank_details")
        .select(`
          account_holder_name,
          bank_name,
          account_number,
          branch_name
        `)
        .eq("practitioner_id", id);

      if (bankError) {
        console.error("Bank fetch error:", bankError);
      }

      bankDetails = bank ?? [];
    }

    // ---------------------------
    // 4️⃣ Patient View
    // ---------------------------
    if (user?.role === "patient") {
      return NextResponse.json({
        success: true,
        practitioner: {
          id: practitioner.id,
          full_name: practitioner.full_name,
          specialization: practitioner.specialization,
          profile_bio: practitioner.profile_bio,
          experience_years: practitioner.experience_years,
          profile_image: practitioner.profile_picture_url,
          appointment_types: appointmentTypes,
        },
      });
    }

    // ---------------------------
    // 5️⃣ Practitioner Authorization
    // ---------------------------
    if (user?.role === "practitioner" && user?.practitioner_id !== id) {
      return NextResponse.json(
        { error: "You cannot view another practitioner's profile" },
        { status: 403 }
      );
    }

    // ---------------------------
    // 6️⃣ Admin / Self View
    // ---------------------------
    return NextResponse.json({
      success: true,
      practitioner: {
        id: practitioner.id,
        gender: practitioner.gender,
        license_number: practitioner.license_number,
        contact_number: practitioner.contact_number,
        contact_email: practitioner.contact_email,
        full_name: practitioner.full_name,
        first_name: practitioner.first_name || null,
        last_name: practitioner.last_name || null,
        profile_bio: practitioner.profile_bio,
        specialization: practitioner.specialization,
        qualifications: practitioner.qualification,
        experience_years: practitioner.experience_years,
        profile_image: practitioner.profile_picture_url,
        available_services: practitioner.available_services,
        appointment_types: appointmentTypes,
      },
      bank_details: bankDetails,
      requested_by: user?.auth_user_id,
    });
  } catch (error: any) {
    console.error("❌ Practitioner fetch failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch practitioner details",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
