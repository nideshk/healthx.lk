import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

/**
 * GET /api/encounters/pending-followups
 *
 * Fetch encounters where:
 * - follow_up_needed = true
 * - follow_up_notified = false
 * - appointment status = completed
 */
export async function GET() {
  // 🔐 Auth check (admin / staff recommended)
  const { authorized, response, user } = await requireUser();
  if (!authorized) return response;

  const role = user?.profile?.role;

  if (role !== "admin" && role !== "superadmin") {
    return NextResponse.json(
      { success: false, message: "Access denied" },
      { status: 403 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("encounters")
    .select(`
      id,
      follow_up_date,
      follow_up_comments,
      clinician_notes,
      follow_up_notified,
      created_at,

      appointments (
        id,
        ends_at,
        status,

        patients (
          id,
          full_name,
          email,
          contact_number
        ),

        practitioners (
          id,
          full_name
        )
      )
    `)
    .eq("follow_up_needed", true)
    .eq("follow_up_notified", false)
    .eq("appointments.status", "completed")
    .order("follow_up_date", { ascending: true });

  if (error) {
    console.error("Pending follow-up fetch error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
  console.log(data)
  // 🔄 Shape response for frontend / consumers
  const items = (data || []).map((row: any) => ({
    encounter_id: row.id,
    completed_date: row.appointments?.ends_at,
    follow_up_date: row.follow_up_date,
    follow_up_comments: row.follow_up_comments,
    clinician_notes: row.clinician_notes,

    patient: {
      name: row.appointments?.patients?.full_name,
      email: row.appointments?.patients?.email,
      phone: row.appointments?.patients?.phone,
    },

    doctor: row.appointments?.practitioners?.full_name,
  }));

  return NextResponse.json({
    success: true,
    count: items.length,
    items,
  });
}

/* -----------------------------------------
   PATCH: Notify follow-up & mark as notified
------------------------------------------ */
export async function PATCH(req: Request) {
  // 1️⃣ Auth
  const { authorized, response, user } = await requireUser();
  if (!authorized) return response;

  // 2️⃣ Role check
  if (!["admin", "superadmin"].includes(user?.role)) {
    return NextResponse.json(
      { message: "Access denied" },
      { status: 403 }
    );
  }

  // 3️⃣ Parse body
  const { encounter_id } = await req.json();

  if (!encounter_id) {
    return NextResponse.json(
      { message: "encounter_id is required" },
      { status: 400 }
    );
  }

  // 4️⃣ Fetch encounter
  const { data, error } = await supabaseAdmin
    .from("encounters")
    .select(`
      id,
      follow_up_date,
      follow_up_comments,
      clinician_notes,
      follow_up_notified,
      created_at,

      appointments (
        id,
        ends_at,
        status,

        patients (
          id,
          full_name,
          email,
          contact_number
        ),

        practitioners (
          id,
          full_name
        )
      )
    `)
    .eq("id", encounter_id)
    .single();

    console.log(data)

    if (error) {
        console.error("notifying error:", error);
        return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
        );
    }

    if (!data) {
        console.error("Encounter not found", error);
        return NextResponse.json(
        { success: false, error: "Encounter not found" },
        { status: 500 }
        );
    }

    const appointment = Array.isArray(data.appointments)
    ? data.appointments[0]
    : data.appointments;

    if (!appointment) {
    throw new Error("Appointment missing");
    }

    const patient = Array.isArray(appointment.patients)
    ? appointment.patients[0]
    : appointment.patients;

    const practitioner = Array.isArray(appointment.practitioners)
    ? appointment.practitioners[0]
    : appointment.practitioners;

    if (!patient || !practitioner) {
    throw new Error("Patient or practitioner missing");
    }



  if (error || !data) {
    return NextResponse.json(
      { message: "Encounter not found" },
      { status: 404 }
    );
  }

  // 5️⃣ Prevent duplicate notify
  if (data.follow_up_notified) {
    return NextResponse.json(
      { message: "Already notified" },
      { status: 409 }
    );
  }


  // 6️⃣ Notify
  await notify({
    userId: patient.id,
    role: "patient",
    eventType: "follow_up_reminder",
    title: "Follow-up Reminder",
    message: `
Hello ${patient.full_name},

Dr. ${practitioner.full_name} has requested a follow-up.

Follow-up Date:
${new Date(data.follow_up_date).toLocaleDateString()}

Regards,
Clinico Team
    `.trim(),
    channels: ["email"],
    payload: {
      email: patient.email,
      encounter_id,
    },
  });

  // 7️⃣ Update state
  const { error: updateError } = await supabaseAdmin
    .from("encounters")
    .update({
      follow_up_notified: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", encounter_id);

  if (updateError) {
    return NextResponse.json(
      { message: "Failed to update encounter" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Follow-up notified successfully",
  });
}
