import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function processNotifications() {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .update({ status: "processing" })
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .in("channel", ["email", "sms"])
    .select("*")
    .limit(50);

  if (error) throw error;

  for (const n of data || []) {
    try {
      if (n.channel === "email") {
        if (!n.payload?.email) {
          throw new Error("Email missing in payload");
        }

        await sendEmail({
          to: n.payload.email,
          subject: n.title || "MedX Notification",
          html: `<p>${n.message}</p>`,
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
