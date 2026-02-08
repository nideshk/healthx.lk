// lib/appointmentInvites.ts
import { notify } from "@/lib/notify";
import { generateAppointmentInviteToken } from "./GenerateAppointmentInvitationToken";

export async function sendAppointmentInvites({
  appointmentId,
  practitionerId,
  attendees,
  meetingStartISO,
  room_key,
}: {
  appointmentId: string;
  practitionerId: string;
  attendees: string[];
  meetingStartISO: string;
  room_key: string;
}) {
  for (const email of attendees) {
    const token = generateAppointmentInviteToken({
      appointmentId,
      email,
      meetingStartISO,
      room_key
    });

    const inviteLink = `https://www.clinecxa.com/meeting?token=${token}`;

    await notify({

      userId: "20d75bab-f17c-4173-a06f-01b4515711c7", // Using email as userId for guest invites
      role: "guest",
      eventType: "appointment_invite",
      channels: ["email"],

      title: "You’re invited to a consultation",
      message: `You’ve been invited to join a consultation scheduled at ${new Date(
        meetingStartISO
      ).toLocaleString()}`,

      payload: {
        email,
        subject: "Consultation Invite",
        actionUrl: inviteLink,
        actionText: "Join Consultation",
        appointment_id: appointmentId,
        practitioner_id: practitionerId,
        starts_at: meetingStartISO,
      },
    });
  }
}
