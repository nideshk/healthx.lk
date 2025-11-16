import { requireUser } from "@/lib/authGuard";
import { clinikoFetch } from "@/lib/cliniko";
import { supabaseClient } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

/**
 * GET /api/practitioners/[id]
 * Fetch practitioner info from Supabase, and appointment types from local DB.
 */
export async function GET(req, context) {
  const { authorized, response, user } = await requireUser();
  if (!authorized) return response;

  try {
    const { id } = context.params;
    if (!id) {
      return NextResponse.json(
        { error: "Practitioner ID is required" },
        { status: 400 }
      );
    }

    // RBAC
    if (user.role === "patient") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // If the requester is a practitioner, ensure they can only view their own record
    if (user.role === "practitioner" && user.practitioner_id !== id) {
      return NextResponse.json(
        { error: "You cannot view another practitioner's profile" },
        { status: 403 }
      );
    }

    // Fetch practitioner by DB id
    const { data: practitioner, error: dbError } = await supabaseClient
      .from("practitioners")
      .select("*")
      .eq("id", id)
      .single();

    if (dbError || !practitioner) {
      console.error("❌ Practitioner not found in Supabase:", dbError?.message);
      return NextResponse.json(
        { error: "Practitioner not found in database" },
        { status: 404 }
      );
    }

    // Fetch appointment types (services) that this practitioner offers.
    // available_services is expected to be an array of appointment_type ids.
    let appointmentTypes = [];
    const serviceIds = practitioner.available_services || [];

    if (Array.isArray(serviceIds) && serviceIds.length > 0) {
      const { data: types, error: typesErr } = await supabaseClient
        .from("appointment_type")
        .select("*")
        .in("id", serviceIds);

      if (typesErr) {
        console.error("Failed to fetch appointment types:", typesErr);
        // don't fail hard — return empty list
      } else {
        appointmentTypes = types.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          duration_mins: t.duration_mins,
          max_attendee: t.max_attendee,
          base_fee: t.base_fee,
        }));
      }
    }

    // Build response object
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
        cliniko_practitioner_id: practitioner.cliniko_practitioner_id || null,
        appointment_types: appointmentTypes,
      },
      requested_by: user.email,
    });
  } catch (error) {
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
