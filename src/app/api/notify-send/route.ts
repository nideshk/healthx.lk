import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { notify } from "@/lib/notify";

export async function POST(req: NextRequest) {
  try {
    /* -------------------------
       AUTH
    -------------------------- */
    const { authorized, response } = await requireUser(req);
    if (!authorized) return response;

    /* -------------------------
       BODY
    -------------------------- */
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const {
      userId,
      role,
      eventType,
      title,
      message,
      channels,
      payload,
      scheduledAt,
    } = body ?? {};

    /* -------------------------
       MINIMAL VALIDATION
    -------------------------- */
    if (!eventType || !message || !Array.isArray(channels)) {
      return NextResponse.json(
        {
          error: "`eventType`, `message`, and `channels` are required",
        },
        { status: 400 }
      );
    }

    /* -------------------------
       CALL notify() AS-IS
    -------------------------- */
    await notify({
      userId: userId ?? null,
      role,
      eventType,
      title,
      message,
      channels,
      payload,
      scheduledAt,
    });

    return NextResponse.json({
      success: true,
      message: "Notification sent successfully",
    });
  } catch (err: any) {
    console.error("POST /api/notify error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
