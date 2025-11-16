import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";



export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseClient;
  const appointmentId = params.id;

  const {authorized , user} = await requireUser();

  console.log("👤 Authenticated user:", user.id);
  if(!authorized){
    return NextResponse.json({ error: "Unauthorized, cannot fetch appointment" }, { status: 401 });
  }

  const userId = user.id;

  // 2) Fetch user role from profiles table
  const { data: profile, error: roleErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("patient_id", userId)
    .single();

    console.log("👤 User profile:", userId);
    console.log(userId === user.id)
    console.log("❗ Role fetch error:", roleErr);

  if (roleErr || !profile) {
    return NextResponse.json(
      { error: "User role not found" },
      { status: 403 }
    );
  }

  const role = profile.role; // 'patient' | 'practitioner' | 'admin'

  // 3) Fetch full appointment + linked entities
  const { data: appointment, error: apptErr } = await supabase
    .from("appointments")
    .select(`
      id,
      starts_at,
      ends_at,
      status,
      notes,
      telehealth_url,
      cancellation_reason,
      cancelled_at,
      rescheduled_at,
      appointment_type:appointment_type_id (
        id,
        name,
        description,
        duration_mins
      ),
      practitioner:practitioner_id (
        id,
        full_name,
        specialization,
        contact_email,
        contact_number,
        profile_picture_url
      ),
      patient:patient_id (
        id,
        full_name,
        email,
        contact_number
      )
    `,
      { head: false }
    )
    .eq("id", appointmentId)
    .single();

  if (apptErr || !appointment) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  // 4) Build role-specific responses

  // -------------------------------------------------------
  // PATIENT VIEW (safe subset)
  // -------------------------------------------------------
  if (role === "patient") {
    // Supabase may return related rows as an array; normalize to single object
    const practitioner = Array.isArray(appointment.practitioner)
      ? appointment.practitioner[0]
      : appointment.practitioner;

    return NextResponse.json({
      id: appointment.id,
      starts_at: appointment.starts_at,
      ends_at: appointment.ends_at,
      status: appointment.status,

      telehealth_url: appointment.telehealth_url, // patient allowed
      appointment_type: appointment.appointment_type,

      practitioner: practitioner
        ? {
            id: practitioner.id,
            full_name: practitioner.full_name,
            specialization: practitioner.specialization,
            profile_picture_url: practitioner.profile_picture_url
          }
        : null,

      // Optional: show cancellation info
      cancellation: appointment.cancellation_reason
        ? {
            reason: appointment.cancellation_reason,
            cancelled_at: appointment.cancelled_at
          }
        : null
    });
  }

  // -------------------------------------------------------
  // PRACTITIONER VIEW
  // -------------------------------------------------------
  if (role === "practitioner") {
    return NextResponse.json({
      ...appointment,

      // Practitioner should see full patient data
      patient: appointment.patient,

      // Practitioner also sees internal notes
      notes: appointment.notes,

      // All appointment type data
      appointment_type: appointment.appointment_type,

      cancellation_reason: appointment.cancellation_reason,
      cancelled_at: appointment.cancelled_at,
      rescheduled_at: appointment.rescheduled_at,
    });
  }

  // -------------------------------------------------------
  // ADMIN VIEW (full access)
  // -------------------------------------------------------
  if (role === "admin") {
    return NextResponse.json({
      ...appointment,
      patient: appointment.patient,
      practitioner: appointment.practitioner
    });
  }

  // If unknown role
  return NextResponse.json(
    { error: "Role not permitted" },
    { status: 403 }
  );
}
