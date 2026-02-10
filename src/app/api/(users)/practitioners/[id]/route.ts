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
          languages: practitioner.languages ?? []
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

    const { data: available, error: availableError } = await supabaseClient
      .from("practitioner_availability")
      .select("*")
      .eq("practitioner_id", id);

    if (availableError) {
      console.error("Available fetch error:", availableError);
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
        languages: practitioner.languages ?? [],
        experience_years: practitioner.experience_years,
        profile_image: practitioner.profile_picture_url,
        available_services: practitioner.available_services,
        appointment_types: appointmentTypes,
        available_days: available,
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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: practitionerId } = await context.params;

    if (!practitionerId) {
      return NextResponse.json(
        { error: "Practitioner identifier is required." },
        { status: 400 }
      );
    }

    const { authorized, role } = await requireUser(request);

    if (!authorized) {
      return NextResponse.json(
        { error: "You are not authorized to perform this action." },
        { status: 401 }
      );
    }

    const isAdmin = ["admin", "superadmin"].includes(role);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only administrators can delete practitioners." },
        { status: 403 }
      );
    }

    /** Fetch practitioner (includes supabase_id) */
    const { data: practitioner, error: fetchError } = await supabaseAdmin
      .from("practitioners")
      .select("id, supabase_user_id, is_active, deleted_at")
      .eq("id", practitionerId)
      .single();

    if (fetchError) throw fetchError;

    if (!practitioner || practitioner.deleted_at) {
      return NextResponse.json(
        { error: "Practitioner already deleted or does not exist." },
        { status: 404 }
      );
    }

    const deletedAt = new Date().toISOString();

    /** 1️⃣ Soft delete practitioner */
    const { error: practitionerError } = await supabaseAdmin
      .from("practitioners")
      .update({
        is_active: false,
        deleted_at: deletedAt,
      })
      .eq("id", practitionerId);

    if (practitionerError) throw practitionerError;

    /** 2️⃣ Soft delete linked profile (by supabase_id) */
    if (practitioner.supabase_user_id) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          is_active: false,
          deleted_at: deletedAt,
        })
        .eq("id", practitioner.supabase_user_id);

      if (profileError) throw profileError;
    }

    return NextResponse.json({
      success: true,
      message: "Practitioner and profile soft-deleted successfully.",
    });
  } catch (err: any) {
    console.error("DELETE /practitioner error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unable to delete practitioner." },
      { status: 500 }
    );
  }
}