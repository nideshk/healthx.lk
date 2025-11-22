import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { supabaseClient } from "@/lib/supabaseClient";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { authorized, response, user } = await requireUser();
  if (!authorized) return response;

  try {
    const id = (await context.params).id;

    if (!id) {
      return NextResponse.json(
        { error: "Practitioner ID is required" },
        { status: 400 }
      );
    }

    console.log(
      `🔍 Fetching practitioner ID: ${id} for user: ${user?.auth_user_id} (${user?.role})`
    );

    // ------------------------------------------------
    // FETCH PRACTITIONER
    // ------------------------------------------------
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

    // ------------------------------------------------
    // FETCH APPOINTMENT TYPES
    // ------------------------------------------------
    let appointmentTypes: any[] = [];

    const serviceIds = practitioner.available_services || [];

    if (Array.isArray(serviceIds) && serviceIds.length > 0) {
      const { data: types } = await supabaseClient
        .from("appointment_type")
        .select("*")
        .in("id", serviceIds);

      appointmentTypes = (types || []).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        duration_mins: t.duration_mins,
        max_attendee: t.max_attendee,
        base_fee: t.base_fee,
      }));
    }

    // ----------------------------------------------------------
    // ROLE-BASED RESPONSES
    // ----------------------------------------------------------

    //
    // 👉 PATIENT — PUBLIC SAFE VIEW
    //
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

    //
    // 👉 PRACTITIONER — SELF ONLY
    //
    if (user?.role === "practitioner" && user?.practitioner_id !== id) {
      return NextResponse.json(
        { error: "You cannot view another practitioner's profile" },
        { status: 403 }
      );
    }

    //
    // 👉 PRACTITIONER (self) OR ADMIN → full details
    //
    return NextResponse.json({
      success: true,
      practitioner: {
        id: practitioner.id,
        full_name: practitioner.full_name,
        first_name: practitioner.first_name || null,
        last_name: practitioner.last_name || null,
        contact_number: practitioner.contact_number,
        contact_email: practitioner.contact_email,
        profile_bio: practitioner.profile_bio,
        specialization: practitioner.specialization,
        qualifications: practitioner.qualification,
        experience_years: practitioner.experience_years,
        price: practitioner.solo_consultation_fee,
        family_price: practitioner.family_consultation_fee,
        profile_image: practitioner.profile_picture_url,
        available_services: practitioner.available_services,
        appointment_types: appointmentTypes,
      },
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
