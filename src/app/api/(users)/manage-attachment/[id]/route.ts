import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { s3 } from "@/lib/s3/s3";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

/* ─────────────────────────────────────────────
   GET: View file (signed URL)
───────────────────────────────────────────── */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { user } = await requireUser(_request);

    /* Ownership check */
    const { data: attachment } = await supabaseAdmin
      .from("attachments")
      .select("id, file_url")
      .eq("id", id)
      .eq("patient_id", user?.patient_id)
      .single();

    if (!attachment) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: attachment.file_url,
    });

    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: 60,
    });

    const cnx = getAuditContext(_request, user);

    await auditLog({
      ...cnx,
      action: "VIEWED",
      entityType: "ATTACHMENT",
      entityId: id,
      purpose: "operations",
      source: "user_portal",
      metadata: { file_url: attachment.file_url }
    })

    return NextResponse.json({
      url: signedUrl,
      expires_in: 60,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Unauthorized" },
      { status: 401 }
    );
  }
}

/* ─────────────────────────────────────────────
   DELETE: Remove file
───────────────────────────────────────────── */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { user } = await requireUser(_request);

    /* 1️⃣ Ownership check */
    const { data: attachment } = await supabaseAdmin
      .from("attachments")
      .select("id, file_url")
      .eq("id", id)
      .eq("patient_id", user?.patient_id)
      .single();

    if (!attachment) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    /* 2️⃣ Delete from S3 */
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: attachment.file_url,
      })
    );

    /* 3️⃣ Delete DB record */
    const { error: deleteError } = await supabaseAdmin
      .from("attachments")
      .delete()
      .eq("id", id)
      .eq("patient_id", user?.patient_id);

    if (deleteError) {
      throw new Error("Database delete failed");
    }

    /* 4️⃣ Audit log */
    await supabaseAdmin.from("hipaa_audit_log").insert({
      actor_user_id: user?.patient_id,
      actor_role: "patient",
      action: "DELETED",
      entity_type: "attachment",
      entity_id: id,
      purpose: "operations",
    });

    return NextResponse.json({
      message: "File deleted successfully",
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Unauthorized" },
      { status: 401 }
    );
  }
}
