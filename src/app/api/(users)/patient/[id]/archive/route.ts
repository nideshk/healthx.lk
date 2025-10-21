import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authGuard";

export const runtime = "nodejs";

/**
 * POST /api/patients/[id]/archive
 * Archives (soft deletes) a Cliniko patient.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 🔒 (Optional) enable for production
    // const { role } = await requireAdmin();
    // if (role !== "admin") {
    //   return NextResponse.json(
    //     { message: "Unauthorized access" },
    //     { status: 401 }
    //   );
    // }

    const id = params.id;
    if (!id) {
      return NextResponse.json({ message: "Missing patient ID" }, { status: 400 });
    }

    // 🧩 Prepare Cliniko API call
    const region = process.env.CLINIKO_REGION || "au1";
    const apiKey = process.env.CLINIKO_API_KEY;
    const authHeader = "Basic " + Buffer.from(apiKey + ":").toString("base64");
    const userAgent = `${process.env.CLINIKO_APP_NAME} (${process.env.CLINIKO_APP_EMAIL})`;

    const url = `https://api.${region}.cliniko.com/v1/patients/${id}/archive`;

    console.log("▶️ Archiving patient:", url);

    // ⚡ Perform Cliniko API POST
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": userAgent,
      },
    });

    const text = await response.text();
    const json = text ? JSON.parse(text) : null;

    // 🧠 Log for debugging (dev only)
    if (process.env.NODE_ENV !== "production") {
      console.log("📤 Cliniko archive response:", response.status, json);
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Cliniko API returned an error",
          status: response.status,
          body: json,
        },
        { status: response.status }
      );
    }

    // ✅ Success
    return NextResponse.json({
      success: true,
      message: "Patient archived successfully",
      data: json,
    });
  } catch (error: any) {
    console.error("❌ Archive patient error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to archive patient",
        error: error?.message || "Unexpected error",
      },
      { status: 500 }
    );
  }
}
