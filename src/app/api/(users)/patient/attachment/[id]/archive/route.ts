import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  console.log("▶️ Archiving Cliniko patient attachment...");

  try {
    // ⬅️ Required for typed routes
    const { id: attachment_id } = await context.params;

    if (!attachment_id) {
      return NextResponse.json(
        { error: "Missing attachment_id" },
        { status: 400 }
      );
    }

    // 🔐 Cliniko API Setup
    const apiKey = process.env.CLINIKO_API_KEY!;
    const region = process.env.CLINIKO_REGION || "au1";

    const authHeader =
      "Basic " + Buffer.from(apiKey + ":").toString("base64");

    const userAgent = `${process.env.CLINIKO_APP_NAME || "Medx"} (${
      process.env.CLINIKO_APP_EMAIL || "admin@medx.app"
    })`;

    const url = `https://api.${region}.cliniko.com/v1/patient_attachments/${attachment_id}/archive`;

    console.log("📡 Calling Cliniko API:", url);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
        "User-Agent": userAgent,
      },
    });

    if (res.status === 204) {
      console.log(`✅ Attachment ${attachment_id} archived successfully`);
      return NextResponse.json({
        message: `Attachment ${attachment_id} archived successfully`,
      });
    }

    // Capture Cliniko error response
    const errorText = await res.text();
    console.error("❌ Cliniko archive failed:", res.status, errorText);

    return NextResponse.json(
      {
        error: "Cliniko API failed",
        status: res.status,
        details: errorText,
      },
      { status: res.status }
    );
  } catch (err: any) {
    console.error("❌ Unexpected error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
