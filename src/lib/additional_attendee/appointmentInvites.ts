import { notify } from "@/lib/notify";
import { generateAppointmentInviteToken } from "./GenerateAppointmentInvitationToken";

type Attendee = {
  email: string;
  relationship: string;
};

export async function sendAppointmentInvites({
  appointmentId,
  practitionerId,
  attendees,
  meetingStartISO,
  room_key,
}: {
  appointmentId: string;
  practitionerId: string;
  attendees: Attendee[];
  meetingStartISO: string;
  room_key: string;
}) {
  for (const attendee of attendees) {
    const token = generateAppointmentInviteToken({
      appointmentId,
      email: attendee.email,
      meetingStartISO,
      room_key,
    });

    const inviteLink = `https://www.clinecxa.com/meeting?token=${token}`;

    await notify({
      userId: attendee.email, // guest identifier
      role: "guest",
      eventType: "appointment_invite",
      channels: ["email"],

      title: "You’re invited to a consultation",
      message: `You’ve been invited to join a consultation scheduled at ${new Date(
        meetingStartISO
      ).toLocaleString()}`,

      payload: {
        email: attendee.email,
        subject: "Consultation Invite",
        actionUrl: inviteLink,
        actionText: "Join Consultation",
        appointment_id: appointmentId,
        practitioner_id: practitionerId,
        starts_at: meetingStartISO,
        relationship: attendee.relationship,
      },
    });
  }
}
