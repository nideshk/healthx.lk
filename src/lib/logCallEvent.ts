type LogCallEventParams = {
  appointmentId: string;
  eventType: string;
  token?: string; // for guest users
  metadata?: Record<string, any>;
};

export async function logCallEvent({
  appointmentId,
  eventType,
  token,
  metadata = {},
}: LogCallEventParams) {
  try {
    await fetch("/api/consultation/audit-log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        appointmentId,
        eventType,
        token,
        metadata,
      }),
      keepalive: true, // IMPORTANT for unload / crash safety
    });
  } catch (err) {
    // never block UI for audit logging
    console.error("logCallEvent failed", err);
  }
}
