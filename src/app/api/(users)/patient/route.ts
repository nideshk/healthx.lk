import { NextResponse } from "next/server";

export const runtime = "nodejs"; // ensure Node.js runtime (not Edge)

export async function POST(req: Request) {
  console.log("▶️ Starting Cliniko direct test...");

  try {
    // 🧠 Read and log the request body safely
    const body = await req.json().catch(() => null);
    console.log("📥 Incoming Request Body:", body);

    const apiKey = process.env.CLINIKO_API_KEY;
    const region = process.env.CLINIKO_REGION || "au4";
    const userAgent = `${process.env.CLINIKO_APP_NAME || "ClincoLocalTest"} (${
      process.env.CLINIKO_APP_EMAIL || "admin@clinco.app"
    })`;

    if (!apiKey) {
      return NextResponse.json({ error: "Missing CLINIKO_API_KEY" }, { status: 400 });
    }

    const authHeader = "Basic " + Buffer.from(apiKey + ":").toString("base64");

    // ✅ Minimal patient payload (must be valid JSON)
 console.log("📤 Preparing Cliniko API call with headers:", body)
    // ✅ Make API call directly to Cliniko
    const res = await fetch(`https://api.${region}.cliniko.com/v1/patients`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": userAgent,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();

    console.log("📤 Cliniko API Response:", {
      status: res.status,
      ok: res.ok,
      body: text,
    });

    return NextResponse.json({
      status: res.status,
      ok: res.ok,
      region,
      userAgent,
      body: text,
    });
  } catch (err: any) {
    console.error("❌ Cliniko direct test failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
