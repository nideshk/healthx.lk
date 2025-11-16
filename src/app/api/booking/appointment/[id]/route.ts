import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";

/* -------------------------------------------------------------
   CONFLICT CHECKER → prevents overlapping appointments
--------------------------------------------------------------*/
async function hasConflict({
  practitionerId,
  newStartsAtISO,
  newEndsAtISO,
  excludeAppointmentId = null,
}: {
  practitionerId: string;
  newStartsAtISO: string;
  newEndsAtISO: string;
  excludeAppointmentId?: string | null;
}): Promise<boolean> {
  let q = supabaseAdmin
    .from("appointments")
    .select("id, starts_at, ends_at")
    .eq("practitioner_id", practitionerId)
    .lt("starts_at", newEndsAtISO) // existing.start < newEnd
    .gt("ends_at", newStartsAtISO) // existing.end > newStart
    .neq("status", "cancelled")
    .limit(1);

  if (excludeAppointmentId) {
    q = q.neq("id", excludeAppointmentId);
  }

  const { data, error } = await q.maybeSingle();

  if (error) {
    console.error("❌ Conflict-check failed:", error);
    throw new Error("Failed to check conflicts");
  }

  return !!data;
}

/* -------------------------------------------------------------
   GET: Fetch appointment details depending on role
--------------------------------------------------------------*/
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { authorized, user , role } = await requireUser();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user?.auth_user_id;



    // Fetch appointment + linked relations
    const { data: appointment, error } = await supabaseClient
      .from("appointments")
      .select(
        `
        id,
        starts_at,
        ends_at,
        status,
        notes,
        telehealth_url,
        cancellation_reason,
        cancelled_at,

        appointment_type:appointment_type_id (
          id,
          name,
          duration_mins
        ),

        practitioner:practitioner_id (
          id,
          full_name,
          profile_picture_url,
          specialization
        ),

        patient:patient_id (
          id,
          full_name,
          email,
          contact_number
        )
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    const practitioner = Array.isArray(appointment.practitioner)
      ? appointment.practitioner[0]
      : appointment.practitioner;

    const patient = Array.isArray(appointment.patient)
      ? appointment.patient[0]
      : appointment.patient;

    if (role === "patient") {
      // Patient sees limited details
      return NextResponse.json({
        id: appointment.id,
        starts_at: appointment.starts_at,
        ends_at: appointment.ends_at,
        status: appointment.status,
        appointment_type: appointment.appointment_type,
        practitioner: {
          id: practitioner?.id,
          full_name: practitioner?.full_name,
          specialization: practitioner?.specialization,
          profile_picture_url: practitioner?.profile_picture_url,
        },
        cancellation:
          appointment.cancellation_reason && {
            reason: appointment.cancellation_reason,
            cancelled_at: appointment.cancelled_at,
          },
      });
    }

    if (role === "practitioner") {
      // Practitioner sees everything
      return NextResponse.json({
        ...appointment,
        patient,
      });
    }

    return NextResponse.json({
      ...appointment,
      patient,
      practitioner,
    });
  } catch (err: any) {
    console.error("❌ GET Appointment Error:", err);
    return NextResponse.json(
      { error: err.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------
   PUT: Reschedule appointment (update start+end)
--------------------------------------------------------------*/
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { authorized, user } = await requireUser();
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { date, time, appointment_type_id } = body;

    if (!date || !time || !appointment_type_id) {
      return NextResponse.json(
        { error: "Required: date, time, appointment_type_id" },
        { status: 400 }
      );
    }

    // Fetch appointment type duration
    const { data: type } = await supabaseClient
      .from("appointment_type")
      .select("duration_mins")
      .eq("id", appointment_type_id)
      .maybeSingle();

    if (!type) {
      return NextResponse.json({ error: "Invalid appointment type" }, { status: 400 });
    }

    const { duration_mins } = type;

    // Build new start/end timestamps
    const starts_at = `${date}T${time}:00`;
    const [h, m] = time.split(":").map(Number);

    const endMinutes = h * 60 + m + duration_mins;
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
    const endM = String(endMinutes % 60).padStart(2, "0");
    const ends_at = `${date}T${endH}:${endM}:00`;

    // Fetch existing appointment
    const { data: appt } = await supabaseAdmin
      .from("appointments")
      .select("id, practitioner_id")
      .eq("id", id)
      .maybeSingle();

    if (!appt) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // CHECK for conflict
    const conflict = await hasConflict({
      practitionerId: appt.practitioner_id,
      newStartsAtISO: starts_at,
      newEndsAtISO: ends_at,
      excludeAppointmentId: id,
    });

    if (conflict) {
      return NextResponse.json(
        { error: "This time conflicts with another booking" },
        { status: 409 }
      );
    }

    // Update appointment
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("appointments")
      .update({
        starts_at,
        ends_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (updateErr) {
      return NextResponse.json(
        { error: "Failed to reschedule", details: updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Appointment rescheduled",
      appointment: updated,
    });
  } catch (err: any) {
    console.error("❌ PUT Reschedule Error:", err);
    return NextResponse.json(
      { error: err.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------
   DELETE: Cancel Appointment
--------------------------------------------------------------*/
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { authorized } = await requireUser();
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { reason } = body;

    const { error } = await supabaseAdmin
      .from("appointments")
      .update({
        status: "cancelled",
        cancellation_reason: reason || null,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to cancel", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Appointment cancelled",
    });
  } catch (err: any) {
    console.error("❌ Cancel Error:", err);
    return NextResponse.json(
      { error: err.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}
