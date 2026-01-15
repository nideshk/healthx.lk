import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { s3 } from "@/lib/s3/s3";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { requireUser } from "@/lib/authGuard";
import { auditLog } from "@/lib/audit/auditLog";

const BUCKET_NAME = process.env.AWS_S3_BUCKET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      application_id,
      fileName,
      fileType,
      fileSize,
      documentType,
    } = body;

    /* ---------------- VALIDATION ---------------- */

    if (
      !application_id ||
      !fileName ||
      !fileType ||
      !fileSize ||
      !documentType
    ) {
      return NextResponse.json(
        {
          error:
            "application_id, fileName, fileType, fileSize, documentType are required",
        },
        { status: 400 }
      );
    }

    if (!["government_id", "supporting_document"].includes(documentType)) {
      return NextResponse.json(
        { error: "Invalid documentType" },
        { status: 400 }
      );
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    /* ---------------- S3 KEY ---------------- */

    const ext = fileName.split(".").pop();
    const fileId = uuidv4();

    const s3Key =
      `practitioner-supporting-document-upload/` +
      `${application_id}/${fileId}.${ext}`;

    /* ---------------- PRESIGN ---------------- */
    console.log("S3key", s3Key)
    console.log("BUCKET:", BUCKET_NAME);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: 300,
    });

    const { user } = await requireUser(req);

    /* ---------------- RESPONSE ---------------- */
    const cnx = getAuditContext(req, user);
    await auditLog({
      ...cnx,
      entityType: "PRACTITIONER",
      metadata: {
        uploadUrl,
        document: {
          file_name: fileName,
          file_url: s3Key,
          file_type: fileType,
          file_size: fileSize,
          document_type: documentType,
        },
      },
      source: "dashboard",
      action: "CREATED"
    })
    return NextResponse.json({
      uploadUrl,
      document: {
        file_name: fileName,
        file_url: s3Key,
        file_type: fileType,
        file_size: fileSize,
        document_type: documentType,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
