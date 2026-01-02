import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/* ---------------------------------------------------------
   Types
--------------------------------------------------------- */
type AuditEvent = {
  appointment_id: string;
  event_type: "joined_call" | "left_call" | "heartbeat";
  created_at: string;
  metadata?: { role?: "patient" | "practitioner" | "guest" };
};

/* ---------------------------------------------------------
   Utilities
--------------------------------------------------------- */

// 🔑 Determine effective end (left_call > last heartbeat)
function getEffectiveEnd(events: AuditEvent[]): Date | null {
  let joinedAt: Date | null = null;
  let lastSeen: Date | null = null;

  for (const e of events) {
    const ts = new Date(e.created_at);

    if (e.event_type === "joined_call") {
      joinedAt = ts;
      lastSeen = ts;
    }

    if (e.event_type === "heartbeat" && joinedAt) {
      lastSeen = ts;
    }

    if (e.event_type === "left_call" && joinedAt) {
      return ts;
    }
  }

  return joinedAt && lastSeen ? lastSeen : null;
}

// 🔑 Correct duration calculation (NO cron-time inflation)
function calculateDuration(events: AuditEvent[]): number {
  let joinedAt: Date | null = null;
  let lastSeen: Date | null = null;

  for (const e of events) {
    const ts = new Date(e.created_at);

    if (e.event_type === "joined_call") {
      joinedAt = ts;
      lastSeen = ts;
    }

    if (e.event_type === "heartbeat" && joinedAt) {
      lastSeen = ts;
    }

    if (e.event_type === "left_call" && joinedAt) {
      return Math.round((ts.getTime() - joinedAt.getTime()) / 1000);
    }
  }

  if (joinedAt && lastSeen) {
    return Math.round((lastSeen.getTime() - joinedAt.getTime()) / 1000);
  }

  return 0;
}

/* ---------------------------------------------------------
   CRON HANDLER
--------------------------------------------------------- */
export async function GET(_req: NextRequest) {
  try {
    /* -----------------------------------------------------
       1️⃣ Fetch logs
    ----------------------------------------------------- */
    const { data: logs, error } = await supabaseAdmin
      .from("consultation_audit_log")
      .select("appointment_id, event_type, created_at, metadata")
      .order("created_at", { ascending: true });

    if (error) throw error;
    if (!logs || logs.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    /* -----------------------------------------------------
       2️⃣ Group logs by appointment
    ----------------------------------------------------- */
    const grouped: Record<string, AuditEvent[]> = {};
    for (const log of logs as AuditEvent[]) {
      grouped[log.appointment_id] ||= [];
      grouped[log.appointment_id].push(log);
    }

    let processed = 0;

    /* -----------------------------------------------------
       3️⃣ Process appointments
    ----------------------------------------------------- */
    for (const appointmentId of Object.keys(grouped)) {
      const events = grouped[appointmentId];

      const { data: appointment } = await supabaseAdmin
        .from("appointments")
        .select(
          "id, starts_at, ends_at, call_ended_at, practitioner_id"
        )
        .eq("id", appointmentId)
        .single();

      if (!appointment || appointment.call_ended_at) continue;

      /* -----------------------------------------------
         Group by role
      ----------------------------------------------- */
      const byRole: Record<string, AuditEvent[]> = {};
      for (const e of events) {
        const role = e.metadata?.role ?? "unknown";
        byRole[role] ||= [];
        byRole[role].push(e);
      }

      const practitionerEvents = byRole["practitioner"] || [];
      const patientEvents = byRole["patient"] || [];

      /* -----------------------------------------------
         Practitioner defines meeting lifecycle
      ----------------------------------------------- */
      const practitionerJoin =
        practitionerEvents.find(e => e.event_type === "joined_call") ??
        null;

      const meetingStartedAt = practitionerJoin?.created_at ?? null;
      const meetingEndedAt =
        getEffectiveEnd(practitionerEvents)?.toISOString() ?? null;

      const meetingDurationSeconds =
        meetingStartedAt && meetingEndedAt
          ? Math.round(
              (new Date(meetingEndedAt).getTime() -
                new Date(meetingStartedAt).getTime()) /
                1000
            )
          : null;

      /* -----------------------------------------------
         Participant summaries
      ----------------------------------------------- */
      const patientEnd = getEffectiveEnd(patientEvents);
      const practitionerEnd = getEffectiveEnd(practitionerEvents);

      const participantSummary = {
        practitioner: {
          started_at: practitionerJoin?.created_at ?? null,
          ended_at: practitionerEnd?.toISOString() ?? null,
          duration_seconds: calculateDuration(practitionerEvents),
          event_count: practitionerEvents.filter(
            e => e.event_type !== "heartbeat"
          ).length,
        },
        patient: {
          started_at:
            patientEvents.find(e => e.event_type === "joined_call")
              ?.created_at ?? null,
          ended_at: patientEnd?.toISOString() ?? null,
          duration_seconds: calculateDuration(patientEvents),
          event_count: patientEvents.filter(
            e => e.event_type !== "heartbeat"
          ).length,
        },
      };

      /* -----------------------------------------------
         Persist audit summary (always)
      ----------------------------------------------- */
      await supabaseAdmin
        .from("consultation_audit_summary")
        .upsert(
          {
            appointment_id: appointmentId,
            practitioner_id: appointment.practitioner_id,
            meeting_started_at: meetingStartedAt,
            meeting_ended_at: meetingEndedAt,
            meeting_duration_seconds: meetingDurationSeconds,
            participant_summary: participantSummary,
            event_timeline: events,
            last_processed_at: new Date().toISOString(),
          },
          { onConflict: "appointment_id" }
        );

      /* -----------------------------------------------
         No-show logic ONLY after scheduled end
      ----------------------------------------------- */
      if (appointment.ends_at && Date.now() >= new Date(appointment.ends_at).getTime()) {
        const practitionerJoined =
          participantSummary.practitioner.started_at !== null;
        const patientJoined =
          participantSummary.patient.started_at !== null;

        let practitionerNoShow = false;
        let patientNoShow = false;
        let status: "completed" | "cancelled" = "completed";

        if (!practitionerJoined && patientJoined) {
          practitionerNoShow = true;
          status = "cancelled";
        }

        if (practitionerJoined && !patientJoined) {
          patientNoShow = true;
          status = "cancelled";
        }

        if (!practitionerJoined && !patientJoined) {
          practitionerNoShow = true;
          patientNoShow = true;
          status = "cancelled";
        }

        await supabaseAdmin
          .from("appointments")
          .update({
            practitioner_no_show: practitionerNoShow,
            patient_no_show: patientNoShow,
            status,
            call_ended_at: meetingEndedAt ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", appointmentId)
          .is("call_ended_at", null);
      }

      processed++;
    }

    return NextResponse.json({ success: true, processed });
  } catch (err) {
    console.error("❌ Consultation finalizer failed:", err);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
