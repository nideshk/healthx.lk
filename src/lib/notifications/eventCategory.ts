export const EVENT_CATEGORY_MAP = {
  // Appointment
  appointment_created: "transactional",
  appointment_confirmed: "transactional",
  appointment_rescheduled: "transactional",
  appointment_cancelled: "transactional",

  // Payments
  payment_success: "transactional",
  payment_failed: "transactional",
  payment_refunded: "transactional",

  // Reminders
  appointment_reminder: "reminder",

  // Medical / Files
  prescription_uploaded: "info",
  file_upload_failed: "info",

  // Security (optional, email-only)
  login_failed: "transactional",
} as const;

export type NotificationCategory =
  | "transactional"
  | "reminder"
  | "info"
  | "marketing";
