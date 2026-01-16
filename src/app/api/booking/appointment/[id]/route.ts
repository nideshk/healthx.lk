import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "@/lib/s3/s3";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";
import { notify } from "@/lib/notify";

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

export async function signViewUrl(s3Key: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: s3Key,
  });

  return getSignedUrl(s3, command, {
    expiresIn: 60 * 60, // 60 minutes
  });
}
/* -------------------------------------------------------------
   GET: Fetch appointment details depending on role
--------------------------------------------------------------*/
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    /* ------------------------------------------------
     * PARAMS
     * ------------------------------------------------ */
    const { id: appointmentId } = await context.params;

    if (!appointmentId) {
      return NextResponse.json(
        { error: "Appointment ID missing" },
        { status: 400 }
      );
    }

    /* ------------------------------------------------
     * AUTH
     * ------------------------------------------------ */
    const { authorized, user, role } = await requireUser(req);

    const cnx = getAuditContext(req, user);
    if (!authorized || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ------------------------------------------------
     * FETCH APPOINTMENT (BASE)
     * ------------------------------------------------ */
    const { data: appointment, error: apptErr } = await supabaseAdmin
      .from("appointments")
      .select(
        `
        id,
        starts_at,
        ends_at,
        status,
        notes,
        telehealth_url,
        currency,
        fee_charged,
        payment_status,
        cancellation_reason,
        cancelled_at,

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
          specialization,
          profile_picture_url
        ),

        patient:patient_id (
          id,
          full_name,
          email,
          contact_number,
          dob,
          allergies,
          blood_type
        )
      `
      )
      .eq("id", appointmentId)
      .maybeSingle();

    if (apptErr || !appointment) {
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

    /* ------------------------------------------------
     * RBAC — APPOINTMENT ACCESS
     * ------------------------------------------------ */
    if (
      role === "patient" &&
      patient?.id !== user.patient_id
    ) {
      await auditLog({
        ...cnx,
        action: "UNAUTHORIZED_ATTEMPT",
        entityType: "APPOINTMENT",
        entityId: appointmentId,
        purpose: "operations",
        source: "user_portal",
        metadata: { data: `${patient?.id} : patient_id_mismatch` }
      })
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (
      role === "practitioner" &&
      practitioner?.id !== user.practitioner_id
    ) {
      await auditLog({
        ...cnx,
        action: "UNAUTHORIZED_ATTEMPT",
        entityType: "APPOINTMENT",
        entityId: appointmentId,
        purpose: "operations",
        source: "dashboard",
        metadata: { data: `${practitioner?.id} : practitioner_id_mismatch` }
      })
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* ------------------------------------------------
     * FETCH ATTACHMENTS (STRICT OWNERSHIP)
     * ------------------------------------------------ */
    let attachments: any[] = [];

    // PATIENT → only their attachments
    if (role === "patient") {
      const { data, error } = await supabaseAdmin
        .from("attachments")
        .select(
          `
          *
        `
        )
        .eq("appointment_id", appointmentId)
        .eq("patient_id", user.patient_id);

      attachments = data ?? [];
      console.log("error", error)
    }

    // PRACTITIONER → only attachments assigned to them
    if (role === "practitioner") {
      const { data } = await supabaseAdmin
        .from("attachments")
        .select(
          `
          *
        `
        )
        .eq("appointment_id", appointmentId)
        .eq("practitioner_id", user.practitioner_id);

      attachments = data ?? [];
    }

    // ADMIN → everything
    if (role === "admin" || role === "superadmin") {
      const { data } = await supabaseAdmin
        .from("attachments")
        .select(
          `
          id,
          file_name,
          file_type,
          file_size,
          created_at,
          patient_id,
          practitioner_id
        `
        )
        .eq("appointment_id", appointmentId);

      attachments = data ?? [];
    }

    /* ------------------------------------------------
     * RESPONSE SHAPING
     * ------------------------------------------------ */
    if (role === "patient") {
      const signedAttachments = await Promise.all(
        attachments.map(async (atc) => ({
          id: atc.id,
          file_name: atc.file_name,
          file_type: atc.file_type,
          file_size: atc.file_size,
          created_at: atc.created_at,
          view_url: await signViewUrl(atc.file_url),
        }))
      );

      await auditLog({
        ...cnx,
        action: "VIEWED",
        entityType: "APPOINTMENT",
        entityId: appointmentId,
        purpose: "treatment",
        source: "user_portal",
        metadata: { appointment_id: appointmentId }
      })

      return NextResponse.json({
        id: appointment.id,
        starts_at: appointment.starts_at,
        ends_at: appointment.ends_at,
        status: appointment.status,
        appointment_type: appointment.appointment_type,
        practitioner,
        notes: appointment.preconsult_responses,
        telehealth_url: appointment.telehealth_url,
        fee_charged: appointment.fee_charged,
        currency: appointment.currency,
        payment_status: appointment.payment_status,
        cancellation:
          appointment.cancellation_reason && {
            reason: appointment.cancellation_reason,
            cancelled_at: appointment.cancelled_at,
          },
        attachments: signedAttachments
      });
    }

    // Practitioner / Admin

    await auditLog({
      ...cnx,
      action: "VIEWED",
      entityType: "APPOINTMENT",
      entityId: appointmentId,
      purpose: "treatment",
      source: "dashboard",
      metadata: { appointment_id: appointmentId }
    })

    return NextResponse.json({
      ...appointment,
      patient,
      practitioner,
      attachments,
    });
  } catch (err: any) {
    console.error("❌ GET Appointment Error", {
      requestId,
      message: err?.message,
      stack: err?.stack,
    });

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { authorized, user } = await requireUser(req);

    const cnx = getAuditContext(req, user);
    if (!authorized) {
      await auditLog({
        ...cnx,
        action: "UNAUTHORIZED_ATTEMPT",
        entityType: "APPOINTMENT",
        entityId: id,
        purpose: "operations",
        source: "user_portal",
        metadata: { data: `unauthorized_access` }
      })
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
      .select(`id, status, patient_id, practitioner_id,
              patient:patient_id ( id, full_name, email ),
              practitioner:practitioner_id ( id, full_name, contact_email )
      `)
      .eq("id", id)
      .maybeSingle();

    if (!appt) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    /* -------------------------------------------------------------
       ACTION: CANCEL
    --------------------------------------------------------------*/
    if (action === "cancel") {

      let cancelledBy: "patient" | "practitioner" | null = null;

      if (user?.patient_id && appt.patient_id === user.patient_id) {
        cancelledBy = "patient";
      }

      if (user?.practitioner_id && appt.practitioner_id === user.practitioner_id) {
        cancelledBy = "practitioner";
      }

      if (!cancelledBy) {
        await auditLog({
          ...cnx,
          action: "UNAUTHORIZED_ATTEMPT",
          entityType: "APPOINTMENT",
          entityId: id,
          purpose: "operations",
          source: "user_portal",
          metadata: { reason: "not appointment owner" },
        });

        return NextResponse.json(
          { error: "You are not allowed to cancel this appointment" },
          { status: 403 }
        );
      }
      const reason = body.reason || null;

      const { error } = await supabaseAdmin
        .from("appointments")
        .update({
          status: "cancelled",
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
          cancelled_by: cancelledBy,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        return NextResponse.json(
          { error: "Cancellation failed", details: error.message },
          { status: 500 }
        );
      }

      /* -------------------------------------------------------------
        NOTIFICATIONS
      --------------------------------------------------------------*/

      const patient = Array.isArray(appt.patient)
        ? appt.patient[0]
        : appt.patient;

      const practitioner = Array.isArray(appt.practitioner)
        ? appt.practitioner[0]
        : appt.practitioner;

      // Notify patient
      if (patient?.id) {
        await notify({
          userId: patient.id,
          role: "patient",
          eventType: "appointment_cancelled",
          title: "Appointment Cancelled",
          message: `
    Hello ${patient.full_name},

    Your appointment has been cancelled by the ${cancelledBy}.

    Reason:
    ${reason || "No reason provided"}

    Regards,
    Clinico Team
          `.trim(),
          channels: ["email"],
          payload: {
            email: patient.email,
            appointment_id: id,
          },
        });
      }

      // Notify practitioner
      if (practitioner?.id) {
        await notify({
          userId: practitioner.id,
          role: "practitioner",
          eventType: "appointment_cancelled",
          title: "Appointment Cancelled",
          message: `
    Hello Dr. ${practitioner.full_name},

    An appointment has been cancelled by the ${cancelledBy}.

    Reason:
    ${reason || "No reason provided"}

    Regards,
    Clinico Team
          `.trim(),
          channels: ["email"],
          payload: {
            email: practitioner.contact_email,
            appointment_id: id,
          },
        });
      }


      await auditLog({
        ...cnx,
        action: "UPDATED",
        entityType: "APPOINTMENT",
        entityId: id,
        purpose: "treatment",
        source: "dashboard",
        metadata: {
          cancellation_reason: reason,
          cancelled_by: cancelledBy,
        },
      })

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

      await auditLog({
        ...cnx,
        action: "UPDATED",
        entityType: "APPOINTMENT",
        entityId: id,
        purpose: "treatment",
        source: "dashboard",
        metadata: { event: "soft_deleted" }
      })

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

      await auditLog({
        ...cnx,
        action: "UPDATED",
        entityType: "APPOINTMENT",
        entityId: id,
        purpose: "treatment",
        source: "dashboard",
        metadata: { updated_fields: Object.keys(updateData) }
      })

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