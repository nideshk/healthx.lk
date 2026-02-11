import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { verifyTelehealthToken } from "@/lib/telehealthToken";

export async function POST(req: NextRequest) {
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
      actorUserId = user.auth_user_id;
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

      // Validate token
      const decoded: any = verifyTelehealthToken(token);
      if (!decoded) {
        return NextResponse.json(
          { error: "Invalid telehealth token" },
          { status: 403 }
        );
      }

      actorUserId = decoded.attendeeId; // unique guest attendee id
      actorRole = "guest";
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
export async function GET(req: NextRequest) {
  /* ----------------------------------------
     1️⃣ Authenticate
  ---------------------------------------- */
  const { user, authorized } = await requireUser(req);

  if (!authorized) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isPractitioner = user?.role === "practitioner";

  if (!isAdmin && !isPractitioner) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  /* ----------------------------------------
     2️⃣ Resolve practitioner_id (only if practitioner)
  ---------------------------------------- */
  let practitionerId = user.practitioner_id

  /* ----------------------------------------
     3️⃣ Build query
  ---------------------------------------- */
  let query = supabaseAdmin
    .from("consultation_audit_summary")
    .select(`
      appointment_id,
      meeting_started_at,
      meeting_ended_at,
      meeting_duration_seconds,
      participant_summary,
      event_timeline,
      created_at,
      last_processed_at,
      practitioner_id,
      appointment:appointments (
        id,
        status,
        starts_at,
        ends_at,
        practitioner_no_show,
        patient_no_show,
        call_ended_at
      )
    `)
    .order("created_at", { ascending: false });

  /* ----------------------------------------
     4️⃣ Scope for practitioner
  ---------------------------------------- */
  if (isPractitioner && practitionerId) {
    query = query.eq("practitioner_id", practitionerId);
  }

  /* ----------------------------------------
     5️⃣ Execute
  ---------------------------------------- */
  const { data, error } = await query;

  if (error) {
    console.error(
      "Failed to fetch consultation audit summaries:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}


