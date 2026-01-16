import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { s3 } from "@/lib/s3/s3";

const BUCKET_NAME = process.env.AWS_S3_BUCKET!;

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    console.log("🔹 [UPLOAD_URL] Request start", { requestId });

    /* ------------------------------------------------
     * AUTH
     * ------------------------------------------------ */
    const auth = await requireUser(req);
    console.log("🔹 [UPLOAD_URL] Auth result", {
      requestId,
      authorized: auth.authorized,
      role: auth.user?.role,
      patient_id: auth.user?.patient_id,
      practitioner_id: auth.user?.practitioner_id,
    });

    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ------------------------------------------------
     * PARAMS (ASYNC)
     * ------------------------------------------------ */
    const { id } = await context.params;

    console.log("🔹 [UPLOAD_URL] Params resolved", {
      requestId,
      id,
    });

    if (!id) {
      return NextResponse.json(
        { error: "Appointment ID missing" },
        { status: 400 }
      );
    }

    /* ------------------------------------------------
     * BODY
     * ------------------------------------------------ */
    const body = await req.json();
    const { fileName, fileType, fileSize } = body;

    console.log("🔹 [UPLOAD_URL] Body received", {
      requestId,
      fileName,
      fileType,
      fileSize,
    });

    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json(
        { error: "fileName, fileType, fileSize required" },
        { status: 400 }
      );
    }

    /* ------------------------------------------------
     * VERIFY APPOINTMENT ACCESS
     * ------------------------------------------------ */
    const { data: appointment, error: apptErr } = await supabaseAdmin
      .from("appointments")
      .select("id, patient_id, practitioner_id")
      .eq("id", id)
      .single();

    console.log("🔹 [UPLOAD_URL] Appointment lookup", {
      requestId,
      found: !!appointment,
      error: apptErr?.message,
      appointment,
    });

    if (apptErr || !appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    if (
      auth.user?.role === "patient" &&
      appointment.patient_id !== auth.user.patient_id
    ) {
      console.warn("⛔ [UPLOAD_URL] Patient forbidden", {
        requestId,
        appointmentPatient: appointment.patient_id,
        userPatient: auth.user.patient_id,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (
      auth.user?.role === "practitioner" &&
      appointment.practitioner_id !== auth.user.practitioner_id
    ) {
      console.warn("⛔ [UPLOAD_URL] Practitioner forbidden", {
        requestId,
        appointmentPractitioner: appointment.practitioner_id,
        userPractitioner: auth.user.practitioner_id,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* ------------------------------------------------
     * BUILD S3 KEY
     * ------------------------------------------------ */
    const extension = fileName.split(".").pop();
    const fileId = uuidv4();

    const s3Key = `appointments/${id}/attachments/${fileId}.${extension}`;

    console.log("🔹 [UPLOAD_URL] S3 key generated", {
      requestId,
      s3Key,
    });

    /* ------------------------------------------------
     * CREATE PRESIGNED URL
     * ------------------------------------------------ */
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: fileType,
      ContentLength: fileSize,
    });

    let uploadUrl: string;
    try {
      uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    } catch (s3Err: any) {
      console.error("🔥 [UPLOAD_URL] S3 presign failed", {
        requestId,
        error: s3Err?.message,
      });
      throw s3Err;
    }

    console.log("✅ [UPLOAD_URL] Presigned URL generated", {
      requestId,
      bucket: BUCKET_NAME,
    });

    return NextResponse.json({
      uploadUrl,
      fileKey: s3Key,
    });
  } catch (err: any) {
    console.error("🔥 [UPLOAD_URL] Fatal error", {
      requestId,
      message: err?.message,
      stack: err?.stack,
    });

    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
