# 📣 Using the Notification Module

This document explains **how to use the notification system** inside the application.

> ⚠️ **Important:**
> Application code must **never send emails or SMS directly**.
> All notifications must be created using the `notify()` helper.

---

## 1️⃣ Overview

The notification system supports three delivery channels:

* 📧 **Email** (Nodemailer)
* 📱 **SMS** (Twilio)
* 🧠 **In-app notifications** (Supabase Realtime)

All notifications follow this flow:

```
Application Event
   ↓
notify()
   ↓
notifications table
   ↓
Background Worker / Realtime
   ↓
Email / SMS / In-app
```

---

## 2️⃣ The `notify()` function

### Location

```
/lib/notify.ts
```

### Signature

```ts
notify({
  userId,
  role,
  eventType,
  title,
  message,
  channels,
  payload,
  scheduledAt,
});
```

### Parameters

| Field         | Type                                             | Required | Description                       |
| ------------- | ------------------------------------------------ | -------- | --------------------------------- |
| `userId`      | `string`                                         | ✅        | Supabase `auth.users.id`          |
| `role`        | `patient \| practitioner \| admin \| superadmin` | ✅        | Recipient role                    |
| `eventType`   | `string`                                         | ✅        | Logical event identifier          |
| `title`       | `string`                                         | ❌        | Notification title (email/in-app) |
| `message`     | `string`                                         | ✅        | Main notification content         |
| `channels`    | `Array<'email' \| 'sms' \| 'in_app'>`            | ✅        | Delivery channels                 |
| `payload`     | `object`                                         | ❌        | Metadata (email, phone, IDs)      |
| `scheduledAt` | `ISO string`                                     | ❌        | Future delivery time              |

---

## 3️⃣ Basic usage examples

### Appointment confirmed (Patient)

```ts
await notify({
  userId: patient.supabase_user_id,
  role: "patient",
  eventType: "appointment_confirmed",
  title: "Appointment Confirmed",
  message: "Your appointment has been confirmed.",
  channels: ["email", "in_app"],
  payload: {
    email: patient.email,
    appointment_id: appointment.id,
  },
});
```

---

### Appointment reminder (30 minutes before)

```ts
await notify({
  userId: patient.supabase_user_id,
  role: "patient",
  eventType: "appointment_reminder",
  message: "Reminder: your appointment starts in 30 minutes.",
  channels: ["sms", "in_app"],
  payload: {
    phone: patient.contact_number,
    appointment_id: appointment.id,
  },
  scheduledAt: reminderTimeISO,
});
```

---

### New appointment (Practitioner)

```ts
await notify({
  userId: practitioner.supabase_user_id,
  role: "practitioner",
  eventType: "new_appointment",
  message: "You have a new appointment scheduled.",
  channels: ["in_app", "email"],
  payload: {
    email: practitioner.contact_email,
    appointment_id: appointment.id,
  },
});
```

---

### System alert (Admin)

```ts
await notify({
  userId: adminUserId,
  role: "admin",
  eventType: "doctor_no_show",
  title: "Doctor No-Show",
  message: "A practitioner did not join the scheduled consultation.",
  channels: ["in_app"],
  payload: {
    appointment_id: appointment.id,
  },
});
```

---

## 4️⃣ In-app notifications (frontend)

### Fetch unread notifications

```ts
SELECT *
FROM notifications
WHERE user_id = auth.uid()
  AND channel = 'in_app'
  AND read_at IS NULL
ORDER BY created_at DESC;
```

---

### Mark notification as read

```ts
UPDATE notifications
SET read_at = now(), status = 'read'
WHERE id = :notification_id;
```

---

## 5️⃣ Background delivery (Email & SMS)

* Email and SMS are sent by a **background worker**
* The worker runs periodically via **cron**
* Only notifications with:

  * `status = 'pending'`
  * `scheduled_at <= now()`
  * `channel IN ('email','sms')`
    are processed

Application code **does not interact with the worker**.

---

## 6️⃣ Best practices

✅ Always use `notify()`
✅ Include contact details in `payload`
✅ Use `scheduledAt` for reminders
❌ Do not send notifications directly
❌ Do not block user requests on delivery

---

## 7️⃣ Supported roles

| Role         | Typical Notifications        |
| ------------ | ---------------------------- |
| Patient      | Booking, reminders, payments |
| Practitioner | New bookings, schedule       |
| Admin        | Exceptions, failures         |
| Superadmin   | System-level alerts          |

---

## 8️⃣ Extensibility

The system is designed to easily support:

* Push notifications
* WhatsApp
* Retry & backoff
* User notification preferences

Without changing application logic.

---

## ✅ Summary

* `notify()` is the **single entry point**
* Notifications are **asynchronous & reliable**
* Delivery channels are **decoupled**
* In-app notifications are **real-time**


