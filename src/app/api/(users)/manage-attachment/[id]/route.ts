import { NextResponse } from "next/server";
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { s3 } from "@/lib/s3/s3";

export async function GET(
  _: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await requireUser();

    /* Ownership enforced here */
    const { data: attachment } = await supabaseAdmin
      .from("attachments")
      .select("id, file_url")
      .eq("id", params.id)
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

    return NextResponse.json({
      url: signedUrl,
      expires_in: 60,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: err.status || 401 }
    );
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await requireUser();

    /* 1️⃣ Fetch attachment (ownership enforced) */
    const { data: attachment } = await supabaseAdmin
      .from("attachments")
      .select("id, file_url")
      .eq("id", params.id)
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
      .eq("id", attachment.id)
      .eq("patient_id", user?.patient_id);

    if (deleteError) {
      throw new Error("DB delete failed");
    }

    /* 4️⃣ (Optional but recommended) Audit log */
    await supabaseAdmin.from("hipaa_audit_log").insert({
      actor_user_id: user?.patient_id,
      actor_role: "patient",
      action: "DELETED",
      entity_type: "attachment",
      entity_id: attachment.id,
      purpose: "operations",
    });

    return NextResponse.json({
      message: "File deleted successfully",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: err.status || 401 }
    );
  }
}