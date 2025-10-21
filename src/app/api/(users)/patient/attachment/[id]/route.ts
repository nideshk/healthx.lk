import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  console.log("▶️ Fetching Cliniko attachments for patient...");

  try {
    const patient_id = params.id;
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || "1";
    const per_page = searchParams.get("per_page") || "20";

    if (!patient_id) {
      return NextResponse.json({ error: "Missing patient_id" }, { status: 400 });
    }

    // 🔐 Cliniko API Setup
    const apiKey = process.env.CLINIKO_API_KEY!;
    const region = process.env.CLINIKO_REGION || "au1"; // Change if needed
    const authHeader = "Basic " + Buffer.from(apiKey + ":").toString("base64");
    const userAgent = `${process.env.CLINIKO_APP_NAME || "Medx"} (${
      process.env.CLINIKO_APP_EMAIL || "admin@medx.app"
    })`;

    // 🩺 Endpoint
    const url = `https://api.${region}.cliniko.com/v1/patients/${patient_id}/patient_attachments?page=${page}&per_page=${per_page}&sort=created_at:desc`;

    console.log("📡 Fetching from Cliniko:", url);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
        "User-Agent": userAgent,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("❌ Cliniko API error:", data);
      return NextResponse.json(
        { error: "Cliniko API failed", details: data },
        { status: res.status }
      );
    }

    console.log(`✅ Found ${data.total_entries || 0} attachments`);

    const attachments = (data.patient_attachments || []).map((a: any) => ({
      id: a.id,
      description: a.description,
      filename: a.filename,
      created_at: a.created_at,
      size: a.size,
      processed: a.processing_completed,
      patient_link: a.patient?.links?.self,
      download_url: a.content?.links?.self,
      uploaded_by: a.user?.links?.self,
    }));

    return NextResponse.json({
      total: data.total_entries,
      attachments,
    });
  } catch (err: any) {
    console.error("❌ Unexpected error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
