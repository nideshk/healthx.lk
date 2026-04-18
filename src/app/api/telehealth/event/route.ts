import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { verifyTelehealthToken } from "@/lib/telehealthToken";

export async function POST(req: Request) {
  try {
    const { token, appointmentId, eventType, metadata = {} } = await req.json();

    if (!appointmentId || !eventType) {
      return NextResponse.json(
        { error: "Missing appointmentId or eventType" },
        { status: 400 }
      );
    }

    let actorUserId = null;
    let actorRole = null;

    // ---------------------------------------------------------
    // 1️⃣ FIRST PRIORITY → LOGGED-IN USER SESSION
    // ---------------------------------------------------------
    const { authorized, user } = await requireUser(req);

    if (authorized && user?.auth_user_id) {
      actorUserId = user.patient_id || user.practitioner_id || user.auth_user_id;
      actorRole = user.role; // patient / practitioner / admin
    }

    // ---------------------------------------------------------
    // 2️⃣ IF NOT LOGGED IN → USE GUEST TOKEN
    // ---------------------------------------------------------
    if (!actorUserId) {
      if (!token) {
        return NextResponse.json(
          { error: "User not authenticated and no guest token provided" },
          { status: 401 }
        );
      }

      const decoded: any = verifyTelehealthToken(token);

      if (!decoded) {
        return NextResponse.json(
          { error: "Invalid telehealth token" },
          { status: 403 }
        );
      }

      // 🔐 HARD SAFETY CHECK
      if (decoded.appointmentId !== appointmentId) {
        return NextResponse.json(
          { error: "Token does not match appointment" },
          { status: 403 }
        );
      }

      actorUserId = `guest:${decoded.email}`;
      actorRole = decoded.role ?? "guest";
    }

    // ---------------------------------------------------------
    // 3️⃣ FINAL SAFETY CHECK
    // ---------------------------------------------------------
    if (!actorUserId) {
      return NextResponse.json(
        { error: "Unable to determine user identity" },
        { status: 403 }
      );
    }

    // ---------------------------------------------------------
    // 4️⃣ WRITE TO AUDIT LOG
    // ---------------------------------------------------------

    await supabaseAdmin.from("consultation_audit_log").insert({
      appointment_id: appointmentId,
      user_id: actorUserId,
      event_type: eventType,
      metadata: { ...metadata, role: actorRole },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Telehealth logging error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
