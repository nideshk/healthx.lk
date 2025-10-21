import { NextResponse } from "next/server";
import { clinikoFetch } from "@/lib/cliniko";
import { requireUser } from "@/lib/authGuard";
import { supabaseClient } from "@/lib/supabaseClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {

  console.log("▶️ Starting Cliniko appointment creation...");

  try {
    const apiKey = process.env.CLINIKO_API_KEY!;
    const region = process.env.CLINIKO_REGION || "au4";
    const userAgent = `${process.env.CLINIKO_APP_NAME || "Medx"} (${
      process.env.CLINIKO_APP_EMAIL || "admin@medx.app"
    })`;
    const authHeader = "Basic " + Buffer.from(apiKey + ":").toString("base64");

    // 📥 Parse incoming data
    const body = await req.json();
    console.log("📥 Incoming Appointment Request:", body);


    const {user} = await requireUser();

    const {
      appointment_type_id,
      practitioner_id,
      starts_at,
      ends_at,
      notes,
      patient_case_id = null, // optional
      repeat_rule = {
        number_of_repeats: 0,
        repeat_type: "None",
        repeating_interval: 0,
      },
    } = body;

    // 🧩 Validate required fields
    if (
      !appointment_type_id ||
      !practitioner_id ||
      !starts_at ||
      !ends_at
    ) {
      return NextResponse.json(
        { error: "Missing required appointment fields" },
        { status: 400 }
      );
    }



    // 🩺 Build Cliniko payload
    const payload = {
      appointment_type_id,
      business_id:"1725382642183972780",
      patient_id: user.cliniko_patient_id,
      practitioner_id,
      starts_at,
      ends_at,
      notes: notes || "Created from Medx Portal",
      patient_case_id,
      repeat_rule,
    };

    console.log("📦 Sending to Cliniko:", payload);

    // 🌍 Send request to Cliniko
    const res = await fetch(
      `https://api.${region}.cliniko.com/v1/individual_appointments`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": userAgent,
        },
        body: JSON.stringify(payload),
      }
    );

    const text = await res.text();
    console.log("📡 Cliniko Response Status:", res.status);
    console.log("📡 Cliniko Response OK:", res.ok);
    console.log("📡 Cliniko Response Body:", text);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Cliniko API failed (${res.status})`, details: text },
        { status: res.status }
      );

    }
    const appointment = JSON.parse(text);
    
      const { error: dbError } = await supabaseAdmin.from("appointments").insert([
  {
    cliniko_appointment_id: appointment.id,          // Cliniko appointment ID
    appointment_type_id,                             // TEXT
    cliniko_patient_id: patient_id,                  // ✅ Use this instead of patient_id (UUID)
    cliniko_practitioner_id: practitioner_id,        // ✅ Use this instead of practitioner_id (UUID)
    starts_at,
    ends_at,
    notes: notes || "Created from Medx Portal",
    status: "confirmed",
    telehealth_url:appointment.telehealth_url,
    business_id: "1725382642183972780",
    created_at: new Date().toISOString(),
    source: "cliniko",
  },
]);

    if (dbError) {
      console.error("⚠️ Failed to insert appointment in Supabase:", dbError);
    } else {
      console.log("📥 Appointment synced to Supabase successfully");
    }


    console.log("✅ Appointment created successfully:", appointment.id);

    return NextResponse.json({
      message: "Appointment created successfully",
      appointment,
    });
  } catch (err: any) {
    console.error("❌ Appointment creation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { authorized, response, user } = await requireUser();
  if (!authorized) return response;

  try {
    const clinikoPatientId = user?.cliniko_patient_id?.toString();
    const isAdmin = user?.role === "admin";

    if (!isAdmin && !clinikoPatientId) {
      return NextResponse.json(
        { error: "No linked Cliniko patient found for this user." },
        { status: 400 }
      );
    }

    // Parse optional query params
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || "1";
    const per_page = searchParams.get("per_page") || "10";
    const sort = searchParams.get("sort") || "created_at:desc";

    let result;

    console.log("Fetching appointments with params:",clinikoPatientId)
    // ✅ Use Cliniko's patient-specific endpoint for regular users
    if (!isAdmin) {
      result = await clinikoFetch(
        `patients/${clinikoPatientId}/appointments?page=${page}&per_page=${per_page}&sort=${sort}`
      );
    } else {
      // Admins can view all appointments
      result = await clinikoFetch(
        `individual_appointments?page=${page}&per_page=${per_page}&sort=${sort}`
      );
    }

    // Normalize data (Cliniko may return `appointments` or `individual_appointments`)
    const list =
      result.individual_appointments || result.appointments || [];

    const appointments = list.map((appt: any) => ({
      id: appt.id,
      patient_name: appt.patient_name,
      starts_at: appt.starts_at,
      ends_at: appt.ends_at,
      telehealth_url: appt.telehealth_url,
      practitioner: appt.practitioner?.links?.self || null,
      business: appt.business?.links?.self || null,
      appointments_type: appt.appointment_type?.name || "N/A",
      status: appt.cancelled_at ? "cancelled" : "confirmed",
    }));

    return NextResponse.json({
      total_entries: result.total_entries || appointments.length,
      page: Number(page),
      per_page: Number(per_page),
      appointments,
      requested_by: user.email,
    });
  } catch (error: any) {
    console.error("❌ Failed to fetch appointments:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}