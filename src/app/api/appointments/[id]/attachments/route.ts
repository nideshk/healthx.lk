import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    console.log("🔹 [ATTACHMENT_META] Request start", { requestId });

    /* ------------------------------------------------
     * AUTH
     * ------------------------------------------------ */
    const auth = await requireUser(req);

    const cnx = getAuditContext(req, auth.user);

    if (!auth.authorized || !auth.user?.patient_id) {

      await auditLog({
        ...cnx,
        action: "UNAUTHORIZED_ATTACHMENT_META_ATTEMPT",
        entityType: "ATTACHMENT",
        purpose: "treatment",
        source: "user_portal",
        metadata: {
          reason: !auth.authorized ? "unauthorized" : "no_patient_context",
        }
      })

      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

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
     * BODY
     * ------------------------------------------------ */
    const body = await req.json();
    const { file_key, file_name, file_type, file_size } = body;


    if (!file_key || !file_name || !file_type || !file_size) {
      console.warn("⛔ [ATTACHMENT_META] Invalid payload", {
        requestId,
      });

      return NextResponse.json(
        { error: "Invalid attachment payload" },
        { status: 400 }
      );
    }

    /* ------------------------------------------------
     * VERIFY APPOINTMENT OWNERSHIP
     * ------------------------------------------------ */
    const { data: appointment, error: apptErr } = await supabaseAdmin
      .from("appointments")
      .select("id, patient_id, practitioner_id")
      .eq("id", appointmentId)
      .single();

    if (apptErr || !appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    if (appointment.patient_id !== auth.user.patient_id) {

      await auditLog({
        ...cnx,
        action: "UNAUTHORIZED_ATTACHMENT_META_ATTEMPT",
        entityType: "ATTACHMENT",
        purpose: "treatment",
        source: "user_portal",
        metadata: {
          data: `${auth.user.patient_id} tried to access attachment meta for appointment ${appointmentId} owned by patient ${appointment.patient_id}`,
        }
      })

      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    /* ------------------------------------------------
     * INSERT ATTACHMENT METADATA
     * ------------------------------------------------ */
    const { error: insertErr } = await supabaseAdmin
      .from("attachments")
      .insert({
        appointment_id: appointmentId,
        patient_id: appointment.patient_id,
        practitioner_id: appointment.practitioner_id,
        file_url: file_key,
        file_name,
        file_type,
        file_size,
      });

    if (insertErr) {
      console.error("🔥 [ATTACHMENT_META] Insert failed", {
        requestId,
        error: insertErr.message,
      });

      return NextResponse.json(
        { error: "Failed to save attachment" },
        { status: 500 }
      );
    }

    await auditLog({
      ...cnx,
      action: "CREATED",
      entityType: "ATTACHMENT",
      purpose: "treatment",
      source: "user_portal",
      metadata: { file_key, file_name, file_type, file_size }
    })

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("🔥 [ATTACHMENT_META] Fatal error", {
      requestId,
      message: err?.message,
      stack: err?.stack,
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
