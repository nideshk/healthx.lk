import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "@/lib/s3/s3";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

const BUCKET_NAME = process.env.AWS_S3_BUCKET!;

type Params = {
  params: {
    id: string;
  };
};

async function signViewUrl(s3Key: string) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  return getSignedUrl(s3, command, {
    expiresIn: 60 * 10, // 10 minutes
  });
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }) {
  try {
    // 🔐 Authentication check
    const { authorized, user } = await requireUser(_req);
    if (!authorized) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const role = user?.profile?.role;

    // 🔒 Authorization check
    if (role !== "admin" && role !== "superadmin") {
      return NextResponse.json(
        {
          success: false,
          message: "Access denied. Admin privileges required.",
        },
        { status: 403 }
      );
    }

    const { id: applicationId } = await context.params;

    if (!applicationId) {
      return NextResponse.json(
        {
          success: false,
          message: "Application ID is required.",
        },
        { status: 400 }
      );
    }

    // ✅ Fetch single application (EXPLICIT fields, NO password)
    const { data, error } = await supabaseAdmin
      .from("practitioner_applications")
      .select(`
        id,
        email,
        first_name,
        last_name,
        state,
        city,
        qualification,
        specialization,
        license_number,
        experience_years,
        contact_email,
        contact_number,
        profile_bio,
        available_services,
        fees,
        languages,
        bank_details,
        status,
        user_created,
        user_id,
        documents,
        created_at,
        updated_at
      `)
      .eq("id", applicationId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          {
            success: false,
            message: "Application not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch application.",
          details: error.message,
        },
        { status: 500 }
      );
    }

    let signedDocuments: any[] = [];

    if (Array.isArray(data.documents)) {
      signedDocuments = await Promise.all(
        data.documents.map(async (doc: any) => ({
          ...doc,
          view_url: await signViewUrl(doc.file_url),
        }))
      );
    }

    const cnx = getAuditContext(_req, user);
    await auditLog({
      ...cnx,
      action: "EXPORTED",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      entityId: data.id || undefined,
      metadata: {
        success: true,
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        documents: signedDocuments,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Unexpected server error.",
        details: err.message,
      },
      { status: 500 }
    );
  }
}
