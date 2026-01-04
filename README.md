# 🏥 MEDx – Telehealth Platform Backend

Clinco is a secure, HIPAA-aligned telehealth backend powering appointment management, authentication, audit logging, document uploads, and admin operations for a medical platform.

This repository contains the **API layer and backend services** built with **Next.js App Router**, **Supabase**, and **AWS S3**.

---

## 🚀 Features

### 🔐 Authentication & Authorization

* Supabase Auth (Email + OAuth providers)
* Role-based access control (Patient, Practitioner, Admin, Superadmin)
* Secure session handling
* Admin-assisted user creation

### 📅 Appointments

* Appointment creation & management
* Practitioner & patient joins
* Admin override booking flows
* Appointment lifecycle tracking

### 📊 HIPAA Audit Logging

* Centralized HIPAA-compliant audit log
* Tracks:

  * LOGIN
  * VIEWED / CREATED / UPDATED / DELETED
  * FAILED_ACCESS
  * EXPORT actions
* Captures:

  * Actor (user & role)
  * Entity type & ID
  * IP address & user agent
  * Metadata & checksum
* Admin-only access with pagination & filters

### 📁 Secure Document Uploads

* Pre-signed S3 upload URLs
* Document type validation (government ID, supporting docs)
* File size & MIME enforcement
* No public bucket access

### 🔔 Notifications

* Email notification worker
* Template-based emails
* Async processing support
* Failure-safe logging

### 📈 Platform Analytics (API-ready)

* Appointment analytics
* User activity tracking
* Audit log–driven insights
* Extensible for dashboards

---

## 🧱 Tech Stack

| Layer     | Technology            |
| --------- | --------------------- |
| Framework | Next.js (App Router)  |
| Backend   | Node.js               |
| Database  | Supabase (PostgreSQL) |
| Auth      | Supabase Auth         |
| Storage   | AWS S3                |
| ORM       | Supabase client       |
| Hosting   | Vercel                |
| Security  | RLS + API Guards      |

---

## 📂 Project Structure

```
src/
├── app/
│   └── api/
│       ├── auth/
│       ├── appointments/
│       ├── audit/
│       ├── documents/
│       └── notifications/
├── lib/
│   ├── authGuard.ts
│   ├── supabaseAdmin.ts
│   ├── auditLogger.ts
│   └── s3/
├── workers/
│   └── notificationWorker.ts
└── utils/
```

---

## 🔑 Environment Variables

Create a `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=

# App
NEXT_PUBLIC_APP_URL=
```

⚠️ **Never commit `.env` files**

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev
```

App runs at:

```
http://localhost:3000
```

---

## 🔒 Security Model

* **API-level authorization enforced**
* **Service-role Supabase client** used only on server
* RLS recommended for defense-in-depth
* No direct client DB writes for sensitive tables
* Audit logs are **append-only**

---

## 🧪 Testing

* Manual API testing via Postman / Hoppscotch
* Role-based access verification
* Audit log validation per action
* S3 upload URL expiration testing

---

## 📜 HIPAA Notes (Important)

This system:

* Logs all access to PHI-relevant entities
* Maintains immutable audit trails
* Supports export for compliance review
* Requires proper infra configuration for full HIPAA compliance
  (BAA, encryption at rest, access policies)

> **HIPAA compliance is a shared responsibility**
> Code + Infra + Processes

---

## 🧩 Future Enhancements

* Admin analytics dashboard
* Real-time session tracking
* Advanced audit log search
* Webhooks for compliance exports
* Background job queue (SQS / BullMQ)

---

## 🤝 Contribution

Internal project.
All changes must:

* Follow audit logging standards
* Include role validation
* Avoid direct DB mutations from client

---

## 📄 License

Private / Proprietary
© MEDx

---
