import { NotificationCategory } from "./eventCategory";

// lib/notifications/resolveChannels.ts
export function resolveChannels({
  category,
  prefs,
}: {
  category: NotificationCategory;
  prefs: any;
}) {
  const channels: Array<"email" | "sms" | "in_app"> = [];

  if (prefs[`${category}_email`]) channels.push("email");
  if (prefs[`${category}_sms`]) channels.push("sms");
  if (prefs[`${category}_in_app`]) channels.push("in_app");

  // ---- SYSTEM OVERRIDES ----

  // Always ensure in-app for transactional
  if (category === "transactional" && !channels.includes("in_app")) {
    channels.push("in_app");
  }

  // Reminders must include SMS
  if (category === "reminder" && !channels.includes("sms")) {
    channels.push("sms");
  }

  return channels;
}
