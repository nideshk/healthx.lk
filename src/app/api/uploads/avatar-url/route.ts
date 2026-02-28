import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

const s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
});

export async function POST(req: NextRequest) {
    console.log("UPLOAD API HIT");
    const auth = await requireUser(req);
    if (!auth.authorized) return auth.response;
    const cnx = getAuditContext(req, auth.user);
    const { contentType } = await req.json();

    if (!contentType?.startsWith("image/")) {
        await auditLog({
            ...cnx,
            action: "FAILED",
            source: "dashboard",
            entityType: "PROFILE",
            entityId: auth.user?.auth_user_id,
            metadata: {
                error: "Invalid file type",
                "user_id": auth.user?.auth_user_id,
            },
            purpose: "operations",
        })
        return NextResponse.json(
            { error: "Invalid file type" },
            { status: 400 }
        );
    }

    const bucket = process.env.PROFILE_PIC_BUCKET!;
    const key = `profile_image/${auth.user.auth_user_id}/image.png`;

    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
    });


    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

    const publicUrl = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    await auditLog({
        ...cnx,
        action: "CREATED",
        source: "dashboard",
        entityType: "PROFILE",
        entityId: auth.user?.auth_user_id,
        metadata: {
            publicUrl,
            "user_id": auth.user?.auth_user_id,
        },
        purpose: "operations",
    })

    return NextResponse.json({
        uploadUrl,
        publicUrl,
    });
}
