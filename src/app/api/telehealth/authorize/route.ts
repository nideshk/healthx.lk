import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard"; // <-- your updated version
import { signTelehealthToken } from "@/lib/telehealthToken";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { room, guestEmail } = body as {
      room?: string;
      guestEmail?: string | null;
    };

    if (!room) {
      return NextResponse.json(
        { authorized: false, error: "Missing room" },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 1. Fetch appointment & participants
    // ---------------------------------------------------------
    const { data: appt, error } = await supabaseAdmin
      .from("appointments")
      .select(`
        id,
        room_key,
        telehealth_url,
        starts_at,
        ends_at,
        status,
        additional_attendees,
        appointment_type:appointment_type_id ( duration_mins ),
        patient:patient_id ( id, email ),
        practitioner:practitioner_id ( id, contact_email )
      `)
      .eq("room_key", room)
      .single();

    if (error || !appt) {
      return NextResponse.json(
        { authorized: false, error: "Appointment not found" },
        { status: 404 }
      );
    }

    // ---------------------------------------------------------
    // 2. TIME WINDOW LOGIC
    // ---------------------------------------------------------
    const now = new Date();
    const start = appt.starts_at ? new Date(appt.starts_at) : now;

    const end = appt.ends_at
      ? new Date(appt.ends_at)
      : new Date(
          start.getTime() +
            (appt.appointment_type?.duration_mins ?? 30) * 60_000
        );

    const windowStart = new Date(start.getTime() - 15 * 60_000);
    const windowEnd = new Date(end.getTime() + 15 * 60_000);

    const isWithinWindow = now >= windowStart && now <= windowEnd;

    // ---------------------------------------------------------
    // 3. Resolve logged-in user identity (optional)
    // ---------------------------------------------------------
    const session = await requireUser();
    const isLoggedIn = session.authorized;

    let allowed = false;
    let resolvedRole: "patient" | "practitioner" | "attendee" | "guest" =
      "guest";
    let subject: string | null = null; // user id or guest email

    const additionalAttendees: string[] =
      Array.isArray(appt.additional_attendees)
        ? appt.additional_attendees
        : [];

    const lowerAdditional = additionalAttendees.map((e) =>
      e.toLowerCase()
    );
    const patientEmail = appt.patient?.email?.toLowerCase() || null;
    const practitionerEmail =
      appt.practitioner?.contact_email?.toLowerCase() || null;

    // ---------------------------------------------------------
    // 4. LOGGED-IN USER AUTHORIZATION
    // ---------------------------------------------------------
    if (isLoggedIn && session.user) {
      const { user } = session;
      const email = user.profile.email?.toLowerCase() || null;

      if (email && email === patientEmail) {
        allowed = true;
        resolvedRole = "patient";
        subject = user.auth_user_id;
      } else if (email && email === practitionerEmail) {
        allowed = true;
        resolvedRole = "practitioner";
        subject = user.auth_user_id;
      } else if (email && lowerAdditional.includes(email)) {
        allowed = true;
        resolvedRole = "attendee";
        subject = user.auth_user_id;
      } else {
        allowed = false;
      }

      // Enforce time window for non-practitioners
      if (allowed && resolvedRole !== "practitioner" && !isWithinWindow) {
        return NextResponse.json(
          { authorized: false, error: "Outside allowed join time" },
          { status: 403 }
        );
      }
    }

    // ---------------------------------------------------------
    // 5. GUEST FLOW (Not logged in)
    // ---------------------------------------------------------
    else if (guestEmail) {
      const guestLower = guestEmail.toLowerCase();

      if (
        guestLower === patientEmail ||
        guestLower === practitionerEmail ||
        lowerAdditional.includes(guestLower)
      ) {
        allowed = true;
        resolvedRole = "guest";
        subject = guestLower;
      }

      if (allowed && !isWithinWindow) {
        return NextResponse.json(
          { authorized: false, error: "Outside allowed time" },
          { status: 403 }
        );
      }
    }

    // ---------------------------------------------------------
    // 6. Not logged in AND no guest email → client must ask for email
    // ---------------------------------------------------------
    else {
      return NextResponse.json(
        { authorized: false, requireEmail: true },
        { status: 401 }
      );
    }

    // ---------------------------------------------------------
    // 7. Deny unauthorized access
    // ---------------------------------------------------------
    if (!allowed || !subject) {
      return NextResponse.json(
        { authorized: false, error: "Not allowed for this appointment" },
        { status: 403 }
      );
    }

    // ---------------------------------------------------------
    // 8. Generate the Telehealth Join Token (JWT)
    // ---------------------------------------------------------
    const token = signTelehealthToken({
      appointmentId: appt.id,
      roomKey: appt.room_key,
      role: resolvedRole,
      sub: subject,
    });

    // ---------------------------------------------------------
    // 9. Write audit log
    // ---------------------------------------------------------
    await supabaseAdmin.from("consultation_audit_log").insert({
      appointment_id: appt.id,
      user_id: subject,
      event_type: "AUTHORIZE",
      metadata: { role: resolvedRole, guest: !isLoggedIn },
    });

    return NextResponse.json({
      authorized: true,
      token,
      role: resolvedRole,
      appointmentId: appt.id,
      telehealth_url: appt.telehealth_url,
    });
  } catch (err: any) {
    console.error("❌ Telehealth authorization error:", err);
    return NextResponse.json(
      { authorized: false, error: "Server error" },
      { status: 500 }
    );
  }
}
