import { requireUser } from "@/lib/authGuard";
import { clinikoFetch } from "@/lib/cliniko";
import { supabaseClient } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

/**
 * GET /api/practitioners/[id]
 * Fetch practitioner info from Supabase, and appointment types from Cliniko.
 */
export async function GET(req, context) {
  const { authorized, response, user } = await requireUser();
  console.log("Authorized:", authorized, "User:", user);
  if (!authorized) return response;

  try {
    const { id } = context.params;
    if (!id)
      return NextResponse.json(
        { error: "Practitioner ID is required" },
        { status: 400 }
      );

    console.log(`👨‍⚕️ Fetching practitioner from Supabase: ${id}`);

    // 🧩 Step 1 — Get practitioner record from Supabase
    const { data: practitioner, error: dbError } = await supabaseClient
      .from("practitioners")
      .select("*")
      .eq("cliniko_practitioner_id", id)
      .single();

    if (dbError || !practitioner) {
      console.error("❌ Practitioner not found in Supabase:", dbError?.message);
      return NextResponse.json(
        { error: "Practitioner not found in database" },
        { status: 404 }
      );
    }

    const clinikoId = practitioner.cliniko_practitioner_id;
    if (!clinikoId) {
      return NextResponse.json(
        {
          error:
            "Practitioner record exists, but missing linked Cliniko practitioner ID",
        },
        { status: 400 }
      );
    }

    console.log(`🔗 Found Cliniko Practitioner ID: ${clinikoId}`);

    // 🧩 Step 2 — Fetch appointment types (offered services) from Cliniko
    const appointmentTypesRes = await clinikoFetch(
      `practitioners/${clinikoId}/appointment_types`
    );

    console.log("appointment_types", appointmentTypesRes)
    // 🧩 Step 3 — Format appointment type data
    const appointmentTypes =
      appointmentTypesRes?.appointment_types?.map((type) => ({
        id: type.id,
        name: type.name,
        duration: type.duration_in_minutes,
        max_attendees : type.max_attendees
      })) || [];

    console.log(`✅ Found ${appointmentTypes.length} appointment types`);

     console.log("practitioner", practitioner)

    // ✅ Step 4 — Return combined response
    return NextResponse.json({
      success: true,
      practitioner: {
        id: practitioner.id,
        first_name: practitioner.first_name,
        full_name: practitioner.full_name,
        last_name: practitioner.last_name,
        email: practitioner.contact_email,
        profile_bio : practitioner.profile_bio,
        contact_number : practitioner.contact_number,
        contact_email : practitioner.contact_email,
        specialization: practitioner.specialization,
        qualifications: practitioner.qualification,
        price: practitioner.solo_consultation_fee,
        profile_image: practitioner.profile_picture_url,
        cliniko_practitioner_id: clinikoId,
        appointment_type : appointmentTypes,
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

/**
 * PUT /api/practitioners/[id]
 * Update Cliniko practitioner ID for a given practitioner record.
 */
export async function PUT(
  req,
  params 
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { cliniko_practitioner_id } = body;

    if (!cliniko_practitioner_id) {
      return NextResponse.json(
        { error: "Missing cliniko_practitioner_id" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseClient
      .from("practitioners")
      .update({ cliniko_practitioner_id })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase Update Error:", error.message);
      return NextResponse.json(
        { error: "Failed to update practitioner", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Practitioner updated successfully", data },
      { status: 200 }
    );
  } catch (err) {
    console.error("Unexpected Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(err) },
      { status: 500 }
    );
  }
}
