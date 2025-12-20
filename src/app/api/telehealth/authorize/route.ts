// src/app/api/telehealth/authorize/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";

const JWT_SECRET = process.env.TELEHEALTH_JWT_SECRET!;
const TOKEN_TTL_SECONDS = 60 * 30; // 30 minutes

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomKey, guestEmail } = body as {
      roomKey?: string;
      guestEmail?: string;
    };

    if (!roomKey) {
      return NextResponse.json(
        { authorized: false, error: "Missing roomKey" },
        { status: 400 }
      );
    }

    // Fetch appointment + linked patient/practitioner + attendees
    const { data: appt, error } : any = await supabaseAdmin
      .from("appointments")
      .select(
        "*"
      )
      .eq("room_key", roomKey)
      .single();

    if (error || !appt) {
      console.error("Authorize: appointment not found", error);
      return NextResponse.json(
        { authorized: false, error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Time window: allow from start-15m to end+15m
    const now = new Date();
    console.log("Authorize: now =", now.toISOString());
    const start = new Date(appt.starts_at);
    console.log("Authorize: appointment starts_at =", start.toISOString());
    const end =
      appt.ends_at ||
      new Date(
        start.getTime() +
          (appt.appointment_type?.duration_mins ?? 30) * 60 * 1000
      );
    // console.log("Authorize: appointment ends_at =", end.toISOString());

    // const windowStart = new Date(start.getTime() - 15 * 60 * 1000);
    // const windowEnd = new Date(end.getTime() + 15 * 60 * 1000);

    // if (now < windowStart || now > windowEnd) {
    //   console.warn("Authorize: outside time window");
    // }

    // Normalize emails
    const patientEmail = appt.patient?.email?.toLowerCase() ?? null;
    const practitionerEmail =
      appt.practitioner?.contact_email?.toLowerCase() ?? null;
    const attendees: string[] = (appt.additional_attendees ?? []).map(
      (e: string) => e.toLowerCase()
    );

    // Base result
    let allowed = false;
    let role: "patient" | "practitioner" | "attendee" | "guest" = "guest";
    let subjectId: string | null = null;
    let subjectEmail: string | null = null;

    // First: try logged-in user
    const session = await requireUser();
    if (session.authorized) {
      const user = session.user;
      const email = session.user?.user.email?.toLowerCase() || null;
      console.log("Authorize: logged in user email =", email);
      console.log("Authorize: practitionerEmail =", user?.practitioner_id);
      console.log("Practitioner _ id", appt.practitioner_id);
      if (appt.patient_id === user?.patient_id) {
        allowed = true;
        role = "patient";
        subjectId = user?.auth_user_id  || null;
        subjectEmail = email;
      } else if (user?.practitioner_id === appt.practitioner_id) {
        allowed = true;
        role = "practitioner";
        subjectId = user?.auth_user_id || null;
        subjectEmail = email;
      } else if (email && attendees.includes(email)) {
        allowed = true;
        role = "attendee";
        subjectId = user?.auth_user_id || null;
        subjectEmail = email;
      }
    } else if (guestEmail) {
      // Not logged in: guest path with email
      const lower = guestEmail.toLowerCase();
      if (
        lower === patientEmail ||
        lower === practitionerEmail ||
        attendees.includes(lower)
      ) {
        allowed = true;
        role = "guest";
        subjectEmail = lower;
      }
    }

    if (!allowed) {
      return NextResponse.json(
        { authorized: false, error: "Not allowed" },
        { status: 403 }
      );
    }

    const payload = {
      appointmentId: appt.id,
      roomKey: appt.room_key,
      role,
      sub: subjectId ?? subjectEmail,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: TOKEN_TTL_SECONDS,
    });

    return NextResponse.json({
      authorized: true,
      token,
      role,
      appointmentId: appt.id,
      roomKey: appt.room_key,
      telehealthUrl: appt.telehealth_url,
    });
  } catch (e) {
    console.error("Authorize error", e);
    return NextResponse.json(
      { authorized: false, error: "Server error" },
      { status: 500 }
    );
  }
}
