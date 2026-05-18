import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  generateAppointmentConfirmationEmail,
  generateAppointmentReminderEmail,
  generatePaymentSuccessEmail,
  generateGenericEmail,
  generatePractitionerConfirmationEmail,
  generateAdminConfirmationEmail
} from "@/lib/emailTemplates";


export async function processNotifications() {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .update({ status: "processing" })
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .in("channel", ["email", "sms", "in_app"])
    .select("*")
    .limit(50);

  if (error) throw error;

  for (const n of data || []) {
    try {
      if (n.channel === "email") {
        if (!n.payload?.email) {
          throw new Error("Email missing in payload");
        }

        // Fetch additional appointment details if appointment_id is provided
        let appointmentData: {
          id: string;
          roomKey: string;
          meetingUrl: string;
          startsAt: string;
          endsAt: string;
          practitionerName: string;
          practitionerEmail?: string;
          appointmentType: string;
          patientName: string;
        } | undefined = undefined;
        if (n.payload?.appointment_id) {
          const { data: appointment } = await supabaseAdmin
            .from("appointments")
            .select(`
              id,
              room_key,
              telehealth_url,
              starts_at,
              ends_at,
              appointment_type_id,
              practitioner_id,
              patient_id
            `)
            .eq("id", n.payload.appointment_id)
            .single();

          if (appointment) {
            // Fetch practitioner details
            const { data: practitioner } = await supabaseAdmin
              .from("practitioners")
              .select("full_name, contact_email")
              .eq("id", appointment.practitioner_id)
              .single();

            // Fetch patient details
            const { data: patient } = await supabaseAdmin
              .from("patients")
              .select("full_name, email")
              .eq("id", appointment.patient_id)
              .single();

            // Fetch appointment type name
            const { data: appointmentType } = await supabaseAdmin
              .from("appointment_type")
              .select("name")
              .eq("id", appointment.appointment_type_id)
              .eq("is_active", true)
              .single();

            appointmentData = {
              id: appointment.id,
              roomKey: appointment.room_key,
              meetingUrl: appointment.telehealth_url,
              startsAt: appointment.starts_at,
              endsAt: appointment.ends_at,
              practitionerName: practitioner?.full_name || "Your Practitioner",
              practitionerEmail: practitioner?.contact_email,
              appointmentType: appointmentType?.name || "Consultation",
              patientName: patient?.full_name || n.payload?.recipientName || "Patient",
            };
          }
        }

        let html: string;

        // Use specific templates based on event type
        switch (n.event_type) {
          case "appointment_confirmed": {
            if (!appointmentData) {
              throw new Error("Appointment details required for appointment confirmation");
            }

            // 🔐 Generate Magic Link for seamless login
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.clinecxa.lk";
            const meetingUrl = `${baseUrl}/appointment/meeting?room=${appointmentData.roomKey}`;

            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
              type: 'magiclink',
              email: n.payload.email,
              options: { redirectTo: meetingUrl }
            });
            console.log("Magic link", meetingUrl)
            console.log("Magic Link Data:", linkData);
            console.log("Magic Link Error:", linkError);

            const actionUrl = linkError ? meetingUrl : linkData.properties.action_link;

            html = generateAppointmentConfirmationEmail({
              recipientName: n.payload?.recipientName,
              appointment: appointmentData,
              actionUrl: actionUrl,
              actionText: "Join Meeting",
            });

            // 📧 Send practitioner email (async/try-catch)
            if (appointmentData.practitionerEmail) {
              try {
                const practitionerHtml = generatePractitionerConfirmationEmail({
                  practitionerName: appointmentData.practitionerName,
                  patientName: appointmentData.patientName,
                  appointment: {
                    startsAt: appointmentData.startsAt,
                    endsAt: appointmentData.endsAt,
                    appointmentType: appointmentData.appointmentType,
                    roomKey: appointmentData.roomKey,
                    meetingUrl: appointmentData.meetingUrl,
                  },
                });
                await sendEmail({
                  to: appointmentData.practitionerEmail,
                  subject: `New Appointment Confirmed - Dr. ${appointmentData.practitionerName}`,
                  html: practitionerHtml,
                });
                console.log("Practitioner confirmation email sent to:", appointmentData.practitionerEmail);
              } catch (pErr) {
                console.error("Failed to send practitioner confirmation email:", pErr);
              }
            }

            // 📧 Send admin/common email (async/try-catch)
            try {
              const adminEmail = process.env.SMTP_USER || "noreply@clinecxa.lk";
              const adminHtml = generateAdminConfirmationEmail({
                practitionerName: appointmentData.practitionerName,
                patientName: appointmentData.patientName,
                appointment: {
                  startsAt: appointmentData.startsAt,
                  endsAt: appointmentData.endsAt,
                  appointmentType: appointmentData.appointmentType,
                },
              });
              await sendEmail({
                to: adminEmail,
                subject: `New Booking Confirmation Alert - Clinecxa`,
                html: adminHtml,
              });
              console.log("Admin confirmation email sent to:", adminEmail);
            } catch (aErr) {
              console.error("Failed to send admin confirmation email:", aErr);
            }
            break;
          }

          case "appointment_reminder": {
            if (!appointmentData) {
              throw new Error("Appointment details required for appointment reminder");
            }

            // 🔐 Generate Magic Link for seamless login
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.clinecxa.lk";
            const meetingUrl = `${baseUrl}/appointment/meeting?room=${appointmentData.roomKey}`;

            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
              type: 'magiclink',
              email: n.payload.email,
              options: { redirectTo: meetingUrl }
            });

            const actionUrl = linkError ? meetingUrl : linkData.properties.action_link;

            html = generateAppointmentReminderEmail({
              recipientName: n.payload?.recipientName,
              appointment: {
                id: appointmentData.id,
                startsAt: appointmentData.startsAt,
                practitionerName: appointmentData.practitionerName,
                roomKey: appointmentData.roomKey,
                meetingUrl: appointmentData.meetingUrl,
              },
              actionUrl: actionUrl,
              actionText: "Join Meeting",
            });
            break;
          }

          case "payment_success":
            html = generatePaymentSuccessEmail({
              recipientName: n.payload?.recipientName,
              payment: {
                amount: n.payload?.amount || 0,
                currency: n.payload?.currency || "LKR",
                status: "Successful",
                appointmentId: n.payload?.appointment_id,
              },
              actionUrl: n.payload?.actionUrl,
              actionText: n.payload?.actionText,
            });
            break;

          default:
            // Fallback to generic template
            html = generateGenericEmail({
              title: n.title || "Clinecxa Notification",
              message: n.message,
              recipientName: n.payload?.recipientName,
              actionUrl: n.payload?.actionUrl,
              actionText: n.payload?.actionText,
            });
            break;
        }

        await sendEmail({
          to: n.payload.email,
          subject: n.title || "Clinecxa Notification",
          html,
        });
      }

      if (n.channel === "sms") {
        if (!n.payload?.phone) {
          throw new Error("Phone missing in payload");
        }

        await sendSMS({
          to: n.payload.phone,
          body: n.message,
        });
      }

      await supabaseAdmin
        .from("notifications")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", n.id);
    } catch (err: any) {
      await supabaseAdmin
        .from("notifications")
        .update({
          status: "failed",
          error_message: err?.message?.slice(0, 500),
        })
        .eq("id", n.id);

      console.error("Notification failed", n.id, err);
    }
  }
}
