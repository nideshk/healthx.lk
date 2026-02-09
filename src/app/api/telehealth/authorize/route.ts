import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";

/* ------------------------------------------------
   CONFIG
------------------------------------------------ */
const JWT_SECRET = process.env.TELEHEALTH_JWT_SECRET!;
const MEDIA_TOKEN_TTL = 60 * 30; // 30 minutes

const EARLY_JOIN_MINUTES = 10;
const LATE_JOIN_MINUTES = 15;

/* ------------------------------------------------
   TYPES
------------------------------------------------ */
type InviteTokenPayload = {
  appointment_id: string;
  email: string;
  role: "guest" | "attendee";
  scope: "appointment:join";
  room_key: string;
};

/* ------------------------------------------------
   HELPERS
------------------------------------------------ */
function isWithinJoinWindow(
  startsAt: string,
  endsAt: string
): { allowed: boolean; reason?: string } {
  const now = new Date();
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  const earlyAllowed = new Date(
    start.getTime() - EARLY_JOIN_MINUTES * 60 * 1000
  );
  const lateAllowed = new Date(
    end.getTime() + LATE_JOIN_MINUTES * 60 * 1000
  );

  if (now < earlyAllowed) {
    return { allowed: false, reason: "Appointment has not started yet" };
  }

  if (now > lateAllowed) {
    return { allowed: false, reason: "Appointment has ended" };
  }

  return { allowed: true };
}

const APPOINTMENT_SELECT = `
  id,
  room_key,
  telehealth_url,
  starts_at,
  ends_at,
  status,
  patient_id,
  practitioner_id
`;

/* ------------------------------------------------
   API HANDLER
------------------------------------------------ */
export async function POST(req: Request) {
  console.log("reaching here check here", req)

  try {
    const body = await req.json();
    const { token, roomKey } = body as {
      token?: string;
      roomKey?: string;
    };

    /* ======================================================
       1️⃣ INVITE TOKEN FLOW (guest / attendee)
    ====================================================== */
    if (token) {
      let decoded: InviteTokenPayload;

      try {
        decoded = jwt.verify(token, JWT_SECRET) as InviteTokenPayload;
      } catch {
        console.log("invalid")
        return NextResponse.json(
          { authorized: false, error: "Invalid or expired invite link" },
          { status: 401 }
        );
      }

      if (decoded.scope !== "appointment:join") {
        return NextResponse.json(
          { authorized: false, error: "Invalid invite scope" },
          { status: 403 }
        );
      }

      const { data: appt, error } = await supabaseAdmin
        .from("appointments")
        .select(APPOINTMENT_SELECT)
        .eq("id", decoded.appointment_id)
        .single();

      if (error || !appt) {
        return NextResponse.json(
          { authorized: false, error: "Appointment not found" },
          { status: 404 }
        );
      }

      // ❌ Block invalid states
      if (["cancelled", "completed"].includes(appt.status)) {
        return NextResponse.json(
          { authorized: false, error: `Appointment is ${appt.status}` },
          { status: 403 }
        );
      }

      // ⏱ Time window enforcement
      const timing = isWithinJoinWindow(appt.starts_at, appt.ends_at);
      if (!timing.allowed) {
        return NextResponse.json(
          { authorized: false, error: timing.reason },
          { status: 403 }
        );
      }

      // 🔐 Issue short-lived media token
      const mediaToken = jwt.sign(
        {
          appointmentId: appt.id,
          roomKey: appt.room_key,
          role: decoded.role,
          sub: decoded.email,
        },
        JWT_SECRET,
        { expiresIn: MEDIA_TOKEN_TTL }
      );

      return NextResponse.json({
        authorized: true,
        token: mediaToken,
        role: decoded.role,
        appointmentId: appt.id,
        roomKey: appt.room_key,
        telehealthUrl: appt.telehealth_url,
      });
    }

    /* ======================================================
       2️⃣ SESSION FLOW (patient / practitioner)
    ====================================================== */
    if (!roomKey) {
      return NextResponse.json(
        { authorized: false, error: "Missing roomKey" },
        { status: 400 }
      );
    }

    const { user, authorized } = await requireUser(req);
    if (!authorized) {
      console.log("user", user, authorized)
      return NextResponse.json(
        { authorized: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: appt, error } = await supabaseAdmin
      .from("appointments")
      .select(APPOINTMENT_SELECT)
      .eq("room_key", roomKey)
      .single();

    if (error || !appt) {
      return NextResponse.json(
        { authorized: false, error: "Appointment not found" },
        { status: 404 }
      );
    }

    // ❌ Block invalid states
    if (["cancelled", "completed"].includes(appt.status)) {
      return NextResponse.json(
        { authorized: false, error: `Appointment is ${appt.status}` },
        { status: 403 }
      );
    }

    // ⏱ Time window enforcement
    const timing = isWithinJoinWindow(appt.starts_at, appt.ends_at);
    if (!timing.allowed) {
      console.log("Timing is not allowed")

      return NextResponse.json(
        { authorized: false, error: timing.reason },
        { status: 403 }
      );
    }

    // 🔍 Role resolution
    let role: "patient" | "practitioner" | null = null;

    if (appt.patient_id === user?.patient_id) {
      role = "patient";
    } else if (appt.practitioner_id === user?.practitioner_id) {
      role = "practitioner";
    }

    if (!role) {
      console.log("role denied")
      return NextResponse.json(
        { authorized: false, error: "Not allowed" },
        { status: 403 }
      );
    }

    // 🔐 Issue short-lived media token
    const mediaToken = jwt.sign(
      {
        appointmentId: appt.id,
        roomKey: appt.room_key,
        role,
        sub: user?.auth_user_id,
      },
      JWT_SECRET,
      { expiresIn: MEDIA_TOKEN_TTL }
    );

    return NextResponse.json({
      authorized: true,
      token: mediaToken,
      role,
      appointmentId: appt.id,
      roomKey: appt.room_key,
      telehealthUrl: appt.telehealth_url,
    });
  } catch (err) {
    console.error("Authorize error:", err);
    return NextResponse.json(
      { authorized: false, error: "Server error" },
      { status: 500 }
    );
  }
}
