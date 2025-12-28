import { sendEmail } from "@/lib/email";
import { getEmailTemplate, renderTemplate } from "@/lib/emailRenderer";
import { sendSMS } from "@/lib/sms";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/* ---------------------------------------------------------
   Map notification event → template_key
--------------------------------------------------------- */
const EMAIL_TEMPLATE_MAP: Record<string, string> = {
  appointment_confirmed: "appointment_confirmed",
  appointment_reminder: "appointment_reminder",
  payment_success: "payment_success",
  generic: "generic_notification",
};

export async function processNotifications() {
  const now = new Date().toISOString();

  console.log("Processing notifications at", now);

  const { data: notifications, error } = await supabaseAdmin
    .from("notifications")
    .update({ status: "processing" })
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .in("channel", ["email", "sms"])
    .select("*")
    .limit(50);

  if (error) throw error;

  for (const n of notifications || []) {
    try {
      /* =====================================================
         EMAIL CHANNEL
      ===================================================== */
      if (n.channel === "email") {
        if (!n.payload?.email) {
          throw new Error("Email missing in payload");
        }

        /* ---------------- Appointment data (optional) ---------------- */
        let appointment: any = null;

        if (n.payload?.appointment_id) {
          const { data: appt } = await supabaseAdmin
            .from("appointments")
            .select(`
              id,
              starts_at,
              ends_at,
              room_key,
              telehealth_url,
              appointment_type_id,
              practitioner_id
            `)
            .eq("id", n.payload.appointment_id)
            .single();

          if (appt) {
            const [{ data: practitioner }, { data: appointmentType }] =
              await Promise.all([
                supabaseAdmin
                  .from("practitioners")
                  .select("full_name")
                  .eq("id", appt.practitioner_id)
                  .single(),
                supabaseAdmin
                  .from("appointment_types")
                  .select("name")
                  .eq("id", appt.appointment_type_id)
                  .single(),
              ]);

            appointment = {
              id: appt.id,
              practitionerName:
                practitioner?.full_name ?? "Your Practitioner",
              appointmentType:
                appointmentType?.name ?? "Consultation",
              startsAt: new Date(appt.starts_at).toLocaleString(),
              endsAt: appt.ends_at
                ? new Date(appt.ends_at).toLocaleString()
                : "",
              roomKey: appt.room_key ?? "",
              meetingUrl: appt.telehealth_url ?? "",
            };
          }
        }

        /* ---------------- Resolve template ---------------- */
        const templateKey =
          EMAIL_TEMPLATE_MAP[n.event_type] ??
          EMAIL_TEMPLATE_MAP.generic;

        const template = await getEmailTemplate(templateKey);

        /* ---------------- Render payload ---------------- */
        const renderData = {
          greeting: n.payload?.recipientName ?? "Hello",
          appointment,
          payment: n.payload?.payment,
          title: n.title,
          message: n.message,
          actionUrl: n.payload?.actionUrl,
          actionText: n.payload?.actionText,
        };

        // Optional debug (remove later)
        console.log(
          "Rendering email",
          templateKey,
          JSON.stringify(renderData, null, 2)
        );

        const html = renderTemplate(template.html, renderData);

        await sendEmail({
          to: n.payload.email,
          subject: n.title || template.name,
          html,
        });
      }

      /* =====================================================
         SMS CHANNEL
      ===================================================== */
      if (n.channel === "sms") {
        if (!n.payload?.phone) {
          throw new Error("Phone missing in payload");
        }

        await sendSMS({
          to: n.payload.phone,
          body: n.message,
        });
      }

      /* =====================================================
         MARK AS SENT
      ===================================================== */
      await supabaseAdmin
        .from("notifications")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", n.id);
    } catch (err: any) {
      console.error("Notification failed", n.id, err);

      await supabaseAdmin
        .from("notifications")
        .update({
          status: "failed",
          error_message: err?.message?.slice(0, 500),
        })
        .eq("id", n.id);
    }
  }
}
