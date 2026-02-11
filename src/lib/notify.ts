import { supabaseAdmin } from "@/lib/supabaseAdmin";

type NotifyInput = {
  userId: string | null;
  role: "patient" | "practitioner" | "admin" | "superadmin" | "guest";
  eventType: string;
  title?: string;
  message: string;
  channels: Array<"email" | "sms" | "in_app">;
  payload?: Record<string, any>;
  scheduledAt?: string;
};

export async function notify({
  userId,
  role,
  eventType,
  title,
  message,
  channels,
  payload = {},
  scheduledAt,
}: NotifyInput) {
  const rows = channels.map((channel) => ({
    user_id: userId,
    role,
    channel,
    event_type: eventType,
    title,
    message,
    payload,
    scheduled_at: scheduledAt ?? new Date().toISOString(),
  }));

  const { data, error } = await supabaseAdmin.from("notifications").insert(rows);
}
