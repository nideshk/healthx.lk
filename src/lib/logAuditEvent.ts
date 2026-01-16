// // lib/logAuditEvent.ts
// export async function logAuditEvent(event: {
//   appointmentId: string;
//   userId: string;
//   eventType: string;
//   metadata?: any;
// }) {
//   try {
//     await fetch("/api/consultation/audit-log", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(event),
//     });
//   } catch (err) {
//     console.error("Failed to log audit event:", err);
//   }
// }

import { authFetch } from "./authFetch";

export async function logAuditEvent({
  appointmentId,
  eventType,
  metadata = {},
  token
}: any) {

  await authFetch("http://localhost:3000/api/consultation/audit-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appointmentId,
      eventType,
      metadata,
      token: token || "",
    }),
  });
}

