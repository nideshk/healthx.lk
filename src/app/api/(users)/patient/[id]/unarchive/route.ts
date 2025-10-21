import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authGuard";

export const runtime = "nodejs";

/**
 * POST /api/patients/[id]/unarchive
 * Restores (unarchives) a Cliniko patient.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
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

    const region = process.env.CLINIKO_REGION || "au1";
    const apiKey = process.env.CLINIKO_API_KEY;
    const userAgent = `${process.env.CLINIKO_APP_NAME || "Clinco"} (${
      process.env.CLINIKO_APP_EMAIL || "admin@clinco.com"
    })`;

    if (!apiKey) {
      throw new Error("Missing CLINIKO_API_KEY in environment variables");
    }

    const authHeader = "Basic " + Buffer.from(apiKey + ":").toString("base64");
    const url = `https://api.${region}.cliniko.com/v1/patients/${id}/unarchive`;

    console.log("▶️ Unarchiving patient:", url);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": userAgent,
      },
      cache: "no-store",
    });

    let body: any = null;
    try {
      const text = await response.text();
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("📤 Cliniko unarchive response:", {
        status: response.status,
        ok: response.ok,
        body,
      });
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Cliniko API returned an error",
          status: response.status,
          data: body,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Patient unarchived successfully",
      data: body,
    });
  } catch (error: any) {
    console.error("❌ Unarchive patient error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to unarchive patient",
        error: error?.message || "Unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
