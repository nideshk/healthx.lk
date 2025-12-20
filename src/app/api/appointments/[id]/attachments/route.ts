import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    console.log("🔹 [ATTACHMENT_META] Request start", { requestId });

    /* ------------------------------------------------
     * AUTH
     * ------------------------------------------------ */
    const auth = await requireUser();

    console.log("🔹 [ATTACHMENT_META] Auth result", {
      requestId,
      authorized: auth.authorized,
      role: auth.user?.role,
      patient_id: auth.user?.patient_id,
    });

    if (!auth.authorized || !auth.user?.patient_id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    /* ------------------------------------------------
     * PARAMS
     * ------------------------------------------------ */
    const { id: appointmentId } = await context.params;

    console.log("🔹 [ATTACHMENT_META] Params resolved", {
      requestId,
      appointmentId,
    });

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

    console.log("🔹 [ATTACHMENT_META] Body received", {
      requestId,
      file_name,
      file_type,
      file_size,
      has_file_key: Boolean(file_key),
    });

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

    console.log("🔹 [ATTACHMENT_META] Appointment lookup", {
      requestId,
      found: Boolean(appointment),
      error: apptErr?.message,
      appointment_patient_id: appointment?.patient_id,
      user_patient_id: auth.user.patient_id,
    });

    if (apptErr || !appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    if (appointment.patient_id !== auth.user.patient_id) {
      console.warn("⛔ [ATTACHMENT_META] Forbidden", {
        requestId,
        appointment_patient_id: appointment.patient_id,
        user_patient_id: auth.user.patient_id,
      });

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
        practitioner_id : appointment.practitioner_id,
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

    console.log("✅ [ATTACHMENT_META] Attachment saved", {
      requestId,
      appointmentId,
      file_name,
    });

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
