import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";

const JWT_SECRET = process.env.TELEHEALTH_JWT_SECRET!;
const MEDIA_TOKEN_TTL = 60 * 30; // 30 mins

type InviteTokenPayload = {
  appointment_id: string;
  email: string;
  role: "guest" | "attendee";
  scope: "appointment:join";
  room_key:  string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, roomKey } = body as {
      token?: string;
      roomKey?: string;
    };

    /* ------------------------------------------------
       1️⃣ JWT INVITE FLOW (guest / attendee)
    ------------------------------------------------ */
    if (token) {
      let decoded: InviteTokenPayload;

      try {
        decoded = jwt.verify(token, JWT_SECRET) as InviteTokenPayload;

        console.log("Decoded invite token:", decoded);
      } catch {
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
        .select("id, room_key, telehealth_url")
        .eq("id", decoded.appointment_id)
        .single();


      if (error || !appt) {
        return NextResponse.json(
          { authorized: false, error: "Appointment not found" },
          { status: 404 }
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

    /* ------------------------------------------------
       2️⃣ SESSION FLOW (patient / practitioner)
    ------------------------------------------------ */
    if (!roomKey) {
      return NextResponse.json(
        { authorized: false, error: "Missing roomKey" },
        { status: 400 }
      );
    }

    const {user , authorized} = await requireUser();
    if (!authorized) {
      return NextResponse.json(
        { authorized: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: appt, error } = await supabaseAdmin
      .from("appointments")
      .select("*")
      .eq("room_key", roomKey)
      .single();

    if (error || !appt) {
      return NextResponse.json(
        { authorized: false, error: "Appointment not found" },
        { status: 404 }
      );
    }

    let role: "patient" | "practitioner" | null = null;

    if (appt.patient_id === user?.patient_id) {
      role = "patient";
    } else if (appt.practitioner_id === user?.practitioner_id) {
      role = "practitioner";
    }

    if (!role) {
      return NextResponse.json(
        { authorized: false, error: "Not allowed" },
        { status: 403 }
      );
    }

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
      roomKey1: appt.room_key,
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
