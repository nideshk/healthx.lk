import { requireAdmin } from "@/lib/authGuard";
import { clinikoFetch } from "@/lib/cliniko";
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // ensure Node.js runtime (not Edge)

 const apiKey = process.env.CLINIKO_API_KEY;
    const region = process.env.CLINIKO_REGION || "au4";
    const userAgent = `${process.env.CLINIKO_APP_NAME || "ClincoLocalTest"} (${
      process.env.CLINIKO_APP_EMAIL || "admin@clinco.app"
    })`;
        const authHeader = "Basic " + Buffer.from(apiKey + ":").toString("base64");

export async function POST(req: Request) {
  console.log("▶️ Starting Cliniko direct test...");

  try {
    // 🧠 Read and log the request body safely
    const body = await req.json().catch(() => null);
    console.log("📥 Incoming Request Body:", body);

   

    if (!apiKey) {
      return NextResponse.json({ error: "Missing CLINIKO_API_KEY" }, { status: 400 });
    }


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


export async function GET() {
  try {
    // 🔒 Require admin privileges
    // const { user, role } = await requireAdmin();

    // if (role !== "admin") {
    //   return NextResponse.json(
    //     { message: "Unauthorized access" },
    //     { status: 401 }
    //   );
    // }

    // ⚡ Fetch patients from Cliniko API using shared utility
    const patients = (await clinikoFetch("patients")).patients;

    // ✅ Return consistent response format
    console.log("patients", patients.patients)
    return NextResponse.json(
      {
        success: true,
        status: 200,
        data: 
          patients.map((patient:any)=>{
            return {
              id: patient.id,
              email : patient.email,
              first_name: patient.first_name,
              last_name: patient.last_name,
              phone: patient.patient_phone_numbers[0]?.normalized_number ?? "N/A"
            }
          })
        ,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ Cliniko API (patients) Error:", error.message);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch patients from Cliniko",
        error: error.message,
      },
      { status: 500 }
    );
  }
}