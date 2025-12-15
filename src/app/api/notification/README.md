# 📣 Using the Notification Module

This document explains **how to correctly use the notification system** inside the application.

> ⚠️ **Important**
> Application code must **never**:
>
> * send emails or SMS directly
> * choose notification channels manually
>
> All notifications must be sent using **`sendNotification()`**.

---

## 1️⃣ Overview

The notification system supports three delivery channels:

* 📧 **Email** (Nodemailer)
* 📱 **SMS** (Twilio)
* 🧠 **In-app notifications** (Supabase Realtime)

Notifications are delivered asynchronously and respect:

* notification type
* user preferences
* system-level rules

```
Application Event
   ↓
sendNotification()
   ↓
notify() (internal)
   ↓
notifications table
   ↓
Background Worker / Realtime
   ↓
Email / SMS / In-app
```

---

## 2️⃣ Public API: `sendNotification()`

### Location

```
/lib/notifications/sendNotification.ts
```

### Signature

```ts
sendNotification({
  userId,
  role,
  eventType,
  title,
  message,
  payload,
});
```

### Parameters

| Field       | Type                                             | Required | Description                  |
| ----------- | ------------------------------------------------ | -------- | ---------------------------- |
| `userId`    | `string`                                         | ✅        | Supabase `auth.users.id`     |
| `role`      | `patient \| practitioner \| admin \| superadmin` | ✅        | Recipient role               |
| `eventType` | `keyof EVENT_CATEGORY_MAP`                       | ✅        | Notification event           |
| `title`     | `string`                                         | ❌        | Title (email / in-app)       |
| `message`   | `string`                                         | ✅        | Notification content         |
| `payload`   | `object`                                         | ❌        | Metadata (email, phone, IDs) |

---

## 3️⃣ Notification categories & preferences

Each `eventType` maps to a **system-defined category**:

* `transactional`
* `reminder`
* `info`
* `marketing`

Example mapping:

```ts
appointment_confirmed → transactional
appointment_reminder  → reminder
prescription_uploaded → info
```

### Channel selection rules

Final delivery channels are determined by:

```
(notification category)
∩
(user preferences)
+
(system overrides)
```

Application code **never** selects channels manually.

---

## 4️⃣ Usage examples (CORRECT)

### Appointment confirmed (Patient)

```ts
await sendNotification({
  userId: patient.supabase_user_id,
  role: "patient",
  eventType: "appointment_confirmed",
  title: "Appointment Confirmed",
  message: "Your appointment has been confirmed.",
  payload: {
    email: patient.email,
    phone: patient.contact_number,
    appointment_id: appointment.id,
  },
});
```

---

### Appointment reminder (30 minutes before)

```ts
await sendNotification({
  userId: patient.supabase_user_id,
  role: "patient",
  eventType: "appointment_reminder",
  message: "Reminder: your appointment starts in 30 minutes.",
  payload: {
    phone: patient.contact_number,
    appointment_id: appointment.id,
  },
});
```

> ⏱ Reminder delivery timing is controlled by `scheduled_at` internally.

---

### New appointment (Practitioner)

```ts
await sendNotification({
  userId: practitioner.supabase_user_id,
  role: "practitioner",
  eventType: "appointment_created",
  message: "You have a new appointment scheduled.",
  payload: {
    email: practitioner.contact_email,
    appointment_id: appointment.id,
  },
});
```

---

### System alert (Admin)

```ts
await sendNotification({
  userId: adminUserId,
  role: "admin",
  eventType: "doctor_no_show",
  title: "Doctor No-Show",
  message: "A practitioner did not join the scheduled consultation.",
  payload: {
    appointment_id: appointment.id,
  },
});
```

---

## 5️⃣ Internal helper: `notify()` (DO NOT USE DIRECTLY)

### Location

```
/lib/notify.ts
```

### Purpose

* Inserts rows into `notifications`
* Assumes channels are already resolved
* Used **only internally**

❌ Must not be used in application code
✅ Used by `sendNotification()`

---

## 6️⃣ In-app notifications (frontend)

### Fetch unread notifications

```sql
SELECT *
FROM notifications
WHERE user_id = auth.uid()
  AND channel = 'in_app'
  AND read_at IS NULL
ORDER BY created_at DESC;
```

---

### Mark notification as read

```sql
UPDATE notifications
SET read_at = now(), status = 'read'
WHERE id = :notification_id;
```

---

## 7️⃣ Background delivery (Email & SMS)

* Email and SMS are delivered by a background worker
* The worker runs via cron
* Application code does not interact with it

Processed notifications must have:

* `status = 'pending'`
* `scheduled_at <= now()`
* `channel IN ('email','sms')`

---

## 8️⃣ Best practices

✅ Always use `sendNotification()`
✅ Include contact details in `payload`
✅ Let preferences decide channels
❌ Never call `notify()` directly
❌ Never send SMS/email synchronously

---

## 9️⃣ Supported roles

| Role         | Typical Notifications        |
| ------------ | ---------------------------- |
| Patient      | Booking, reminders, payments |
| Practitioner | New bookings, schedule       |
| Admin        | Exceptions, failures         |
| Superadmin   | System-level alerts          |

---

## ✅ Summary

* `sendNotification()` is the **only public API**
* User preferences are always respected
* Channel logic is centralized and safe
* Delivery is asynchronous and reliable

---

## 🔒 Final recommendation

**Reject any PR that calls `notify()` directly.**
This rule keeps your notification system correct long-term.

