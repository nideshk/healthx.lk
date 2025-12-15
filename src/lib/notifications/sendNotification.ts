// lib/notifications/sendNotification.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notify } from "@/lib/notify";
import { EVENT_CATEGORY_MAP } from "./eventCategory";
import { resolveChannels } from "./resolveChannels";

export async function sendNotification({
  userId,
  role,
  eventType,
  title,
  message,
  payload = {},
}: {
  userId: string;
  role: "patient" | "practitioner" | "admin" | "superadmin";
  eventType: keyof typeof EVENT_CATEGORY_MAP;
  title?: string;
  message: string;
  payload?: Record<string, any>;
}) {
  // 1️⃣ category
  const category = EVENT_CATEGORY_MAP[eventType];

  // 2️⃣ preferences
  const { data: prefs } = await supabaseAdmin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  const safePrefs = prefs ?? {
    transactional_email: true,
    transactional_sms: false,
    transactional_in_app: true,
    reminder_email: false,
    reminder_sms: true,
    reminder_in_app: true,
    info_email: true,
    info_sms: false,
    info_in_app: true,
  };

  // 3️⃣ resolve channels
  const channels = resolveChannels({
    category,
    prefs: safePrefs,
  });

  if (channels.length === 0) return;

  // 4️⃣ create notifications
  await notify({
    userId,
    role,
    eventType,
    title,
    message,
    channels,
    payload,
  });
}
