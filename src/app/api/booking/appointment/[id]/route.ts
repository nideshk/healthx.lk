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
        currency,
        fee_charged,
        payment_status,

        appointment_type:appointment_type_id (
          id,
          name,
          duration_mins
        ),

        preconsult_responses:preconsult_responses (
      id,
      raw_payload,
      created_at
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
      console.log("Appointment fetch error:", error);
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
        notes : appointment.preconsult_responses,
        telehealth_url: appointment.telehealth_url,
        fee_charged: appointment.fee_charged,
        currency: appointment.currency,
        payment_status: appointment.payment_status,
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

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { authorized } = await requireUser();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    /* -------------------------------------------------------------
       LOAD EXISTING APPOINTMENT
    --------------------------------------------------------------*/
    const { data: appt } = await supabaseAdmin
      .from("appointments")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();

    if (!appt) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    /* -------------------------------------------------------------
       ACTION: CANCEL
    --------------------------------------------------------------*/
    if (action === "cancel") {
      const reason = body.reason || null;

      const { error } = await supabaseAdmin
        .from("appointments")
        .update({
          status: "cancelled",
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        return NextResponse.json(
          { error: "Cancellation failed", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Appointment cancelled",
      });
    }

    /* -------------------------------------------------------------
       ACTION: DELETE (soft delete)
       Marks as deleted without losing record
    --------------------------------------------------------------*/
    if (action === "delete") {
      const { error } = await supabaseAdmin
        .from("appointments")
        .update({
          status: "deleted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        return NextResponse.json(
          { error: "Delete failed", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Appointment deleted",
      });
    }

    /* -------------------------------------------------------------
       ACTION: UPDATE (generic fields)
       Example:
       {
          "action": "update",
          "data": { "notes": "...", "telehealth_url": "..." }
       }
    --------------------------------------------------------------*/
    if (action === "update") {
      const updateData = body.data;

      if (!updateData || typeof updateData !== "object") {
        return NextResponse.json({ error: "Missing 'data' payload" }, { status: 400 });
      }

      const { data: updated, error } = await supabaseAdmin
        .from("appointments")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { error: "Update failed", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Appointment updated",
        appointment: updated,
      });
    }

    /* -------------------------------------------------------------
       INVALID ACTION
    --------------------------------------------------------------*/
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (err: any) {
    console.error("❌ Update Appointment Error:", err);
    return NextResponse.json(
      { error: err.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}