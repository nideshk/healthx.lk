// lib/inviteToken.ts
import jwt from "jsonwebtoken";

const INVITE_SECRET = process.env.TELEHEALTH_JWT_SECRET!;

export function generateAppointmentInviteToken({
  appointmentId,
  email,
  meetingStartISO,
  room_key,
}: {
  appointmentId: string;
  email: string;
  meetingStartISO: string;
  room_key: string;
}) {
  const expiry = new Date(
    new Date(meetingStartISO).getTime() + 6 * 60 * 60 * 1000
  );

  return jwt.sign(
    {
      sub: "appointment_invite",
      appointment_id: appointmentId,
      email,
      role: "guest",
      scope: "appointment:join",
      room_key,
    },
    INVITE_SECRET,
    {
      expiresIn: Math.floor((expiry.getTime() - Date.now()) / 1000),
    }
  );
}
