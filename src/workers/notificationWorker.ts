import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function processNotifications() {
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .in("channel", ["email", "sms"])
    .limit(50);

  if (error) throw error;

  for (const n of data || []) {
    try {
      if (n.channel === "email") {
        await sendEmail({
          to: n.payload.email,
          subject: n.title || "MedX Notification",
          html: `<p>${n.message}</p>`,
        });
      }

      if (n.channel === "sms") {
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
        })
        .eq("id", n.id);

      console.error("Notification failed", n.id, err.message);
    }
  }
}
