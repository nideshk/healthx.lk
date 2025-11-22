import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";

// Helper: calculate 2 week window
function getDateRange() {
  const now = new Date();
  const twoWeeksLater = new Date();
  twoWeeksLater.setDate(now.getDate() + 14);

  return {
    start: now.toISOString(),
    end: twoWeeksLater.toISOString(),
  };
}

export async function GET(
  req: Request,
  context: { params: { id: string } }
) {
  const { authorized, user, response } = await requireUser();
  if (!authorized) return response;

  const supabase = supabaseClient;
  const practitionerId = context.params.id;

  if (!practitionerId) {
    return NextResponse.json(
      { error: "Practitioner ID required" },
      { status: 400 }
    );
  }

  // Fetch practitioner record
  const { data: practitioner, error: practitionerErr } = await supabase
    .from("practitioners")
    .select("*")
    .eq("id", practitionerId)
    .single();

  if (practitionerErr || !practitioner) {
    return NextResponse.json(
      { error: "Practitioner not found" },
      { status: 404 }
    );
  }

  // -------------------------------------------------------
  // RBAC VALIDATION
  // -------------------------------------------------------
  const isSelf =
    user?.role === "practitioner" && user?.practitioner_id === practitionerId;
  const isAdmin = user?.role === "admin";
  const isPatient = user?.role === "patient";

  // Practitioners can only view THEIR OWN full data
  if (user?.role === "practitioner" && !isSelf) {
    return NextResponse.json(
      { error: "You cannot view another practitioner's data" },
      { status: 403 }
    );
  }

  // -------------------------------------------------------
  // FETCH APPOINTMENTS (Next 14 days)
  // -------------------------------------------------------
  const { start, end } = getDateRange();

  const { data: appointments, error: appointmentsErr } = await supabase
    .from("appointments")
    .select(
      `
      id,
      starts_at,
      ends_at,
      status,
      notes,
      patient_id,
      patient:patients(full_name, id),
      appointment_type:appointment_type(name, duration_mins)
    `
    )
    .eq("practitioner_id", practitionerId)
    .gte("starts_at", start)
    .lte("starts_at", end)
    .order("starts_at", { ascending: true });

  if (appointmentsErr) {
    console.error("Appointment fetch error:", appointmentsErr);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }

  // -------------------------------------------------------
  // SANITIZE APPOINTMENTS FOR PATIENTS
  // -------------------------------------------------------
  let sanitizedAppointments:any = appointments;

  if (isPatient) {
    sanitizedAppointments = appointments.map((appt) => ({
      id: appt.id,
      starts_at: appt.starts_at,
      ends_at: appt.ends_at,
      status: appt.status,
      patient: null, // hide patient details
      appointment_type: appt.appointment_type,
      
    }));
  }

  // -------------------------------------------------------
  // FORMAT PRACTITIONER PUBLIC DATA
  // -------------------------------------------------------
  const practitionerPublic = {
    id: practitioner.id,
    full_name: practitioner.full_name,
    specialization: practitioner.specialization,
    profile_bio: practitioner.profile_bio,
    experience_years: practitioner.experience_years,
    profile_image: practitioner.profile_picture_url,
  };

  // -------------------------------------------------------
  // FULL PRACTITIONER DATA (Self or Admin)
  // -------------------------------------------------------
  const practitionerFull = {
    ...practitionerPublic,
    qualification: practitioner.qualification,
    contact_email: practitioner.contact_email,
    contact_number: practitioner.contact_number,
    solo_consultation_fee: practitioner.solo_consultation_fee,
    family_consultation_fee: practitioner.family_consultation_fee,
  };

  // -------------------------------------------------------
  // RETURN DATA BASED ON ROLE
  // -------------------------------------------------------
  return NextResponse.json({
    success: true,
    practitioner: isAdmin || isSelf ? practitionerFull : practitionerPublic,
    appointments: sanitizedAppointments,
    range: { start, end },
  });
}
