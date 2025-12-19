import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
 
  try {
    const id = (await context.params).id;

    if (!id) {
      return NextResponse.json(
        { error: "Practitioner ID is required" },
        { status: 400 }
      );
    }

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

    return NextResponse.json({
      success: true,
      practitioner: {
        id: practitioner.id,
        gender: practitioner.gender,
        license_number : practitioner.license_number,
        contact_number : practitioner.contact_number,
        contact_email : practitioner.contact_email,
        full_name: practitioner.full_name,
        first_name: practitioner.first_name || null,
        last_name: practitioner.last_name || null,        
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
