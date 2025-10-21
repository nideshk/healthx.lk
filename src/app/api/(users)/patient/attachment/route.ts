import { NextResponse } from "next/server";
import FormData from "form-data";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

export const runtime = "nodejs";

export async function POST(req: Request) {
  console.log("▶️ Starting full Cliniko attachment upload flow...");

  try {
    const form = await req.formData();
    const file = form.get("file") as File;
    const patient_id = form.get("patient_id") as string;
    const description = (form.get("description") as string) || "Uploaded via Medx";

    if (!file || !patient_id) {
      return NextResponse.json({ error: "Missing file or patient_id" }, { status: 400 });
    }

    // 🔹 Prepare file data
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name || "upload.txt";
    const fileType = file.type || "application/octet-stream";

    // 🔹 Auth setup
    const apiKey = process.env.CLINIKO_API_KEY!;
    const region = process.env.CLINIKO_REGION || "au4";
    const userAgent = `${process.env.CLINIKO_APP_NAME || "Medx"} (${
      process.env.CLINIKO_APP_EMAIL || "admin@medx.app"
    })`;
    const authHeader = "Basic " + Buffer.from(apiKey + ":").toString("base64");

    console.log("📡 Getting presigned POST URL for patient:", patient_id);

    // STEP 1️⃣ — Get presigned upload URL from Cliniko
    const presignedRes = await fetch(
      `https://api.${region}.cliniko.com/v1/patients/${patient_id}/attachment_presigned_post`,
      {
        method: "GET",
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
          "User-Agent": userAgent,
        },
      }
    );

    const presignedData = await presignedRes.json();

    if (!presignedRes.ok) {
      console.error("❌ Failed to get presigned URL:", presignedData);
      return NextResponse.json(
        { error: "Failed to get presigned URL", details: presignedData },
        { status: presignedRes.status }
      );
    }

    const { url, fields } = presignedData;
    console.log("✅ Got presigned URL:", url);

    // STEP 2️⃣ — Upload file to Cliniko’s S3
    console.log("📤 Uploading file to Cliniko S3...");

    const s3Form = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      s3Form.append(key, value as string);
    }

    s3Form.append("file", fileBuffer, {
      filename: fileName,
      contentType: fileType,
    });

    const contentLength = await new Promise<number>((resolve, reject) => {
      s3Form.getLength((err, length) => {
        if (err) reject(err);
        else resolve(length);
      });
    });

    const s3Headers = {
      ...s3Form.getHeaders(),
      "Content-Length": contentLength,
    };

    const s3Res = await axios.post(url, s3Form, {
      headers: s3Headers,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: () => true,
    });

    const s3Text = typeof s3Res.data === "string" ? s3Res.data : JSON.stringify(s3Res.data);
    console.log("📦 S3 Upload response:", s3Text);

    if (s3Res.status !== 201) {
      console.error("❌ Upload to S3 failed:", s3Text);
      return NextResponse.json(
        { error: "S3 upload failed", details: s3Text },
        { status: s3Res.status }
      );
    }

    // Extract <Key> from XML
    const keyMatch = s3Text.match(/<Key>(.*?)<\/Key>/);
    if (!keyMatch) throw new Error("Missing <Key> in S3 XML response");

    const key = keyMatch[1];
    // ✅ FIX: ensure trailing slash in URL
    const upload_url = `${url.endsWith("/") ? url : url + "/"}${key}`;

    console.log("✅ File uploaded to S3:", upload_url);

    // STEP 3️⃣ — Register attachment in Cliniko
    console.log("📋 Registering file in Cliniko...");

    const attachRes = await fetch(`https://api.au4.cliniko.com/v1/patient_attachments`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": userAgent,
      },
      body: JSON.stringify({
        patient_id,
        description,
        upload_url,
        filename: fileName,
      }),
    });

    const attachData = await attachRes.json();
    if (!attachRes.ok) {
      console.error("❌ Cliniko register failed:", attachData);
      return NextResponse.json(
        { error: "Cliniko API failed", details: attachData },
        { status: attachRes.status }
      );
    }

    console.log("✅ Cliniko attachment created:", attachData.id);

    // STEP 4️⃣ — Mirror in Supabase
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { error: dbError } = await supabase.from("attachments").insert({
        cliniko_attachment_id: attachData.id,
        patient_id,
        filename: fileName,
        description,
        uploaded_at: new Date().toISOString(),
      });

      if (dbError) console.warn("⚠️ Supabase insert warning:", dbError.message);
      else console.log("✅ Attachment mirrored in Supabase.");
    } catch (e: any) {
      console.warn("⚠️ Could not mirror in Supabase:", e.message);
    }

    // ✅ STEP 5️⃣ — Respond success
    return NextResponse.json({
      message: "Attachment uploaded successfully",
      cliniko_attachment_id: attachData.id,
      patient_id,
      filename: fileName,
      description,
    });
  } catch (err: any) {
    console.error("❌ Unexpected error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

