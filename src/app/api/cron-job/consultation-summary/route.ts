import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/* ---------------------------------------------------------
   Types
--------------------------------------------------------- */
type Role = "patient" | "practitioner" | "guest" | "unknown";

type AuditEvent = {
  appointment_id: string;
  event_type: "joined_call" | "left_call" | "heartbeat";
  created_at: string;
  metadata?: { role?: Role };
};

type Session = {
  started_at: string;
  ended_at: string;
  inferred: boolean;
  duration_seconds: number;
};

/* ---------------------------------------------------------
   Session Builder (MULTI-SESSION SAFE)
--------------------------------------------------------- */
function buildSessions(events: AuditEvent[]): Session[] {
  const sessions: Session[] = [];

  let joinedAt: Date | null = null;
  let lastSeen: Date | null = null;

  for (const e of events) {
    const ts = new Date(e.created_at);

    if (e.event_type === "joined_call") {
      joinedAt = ts;
      lastSeen = ts;
      continue;
    }

    if (e.event_type === "heartbeat" && joinedAt) {
      lastSeen = ts;
      continue;
    }

    if (e.event_type === "left_call" && joinedAt) {
      sessions.push({
        started_at: joinedAt.toISOString(),
        ended_at: ts.toISOString(),
        inferred: false,
        duration_seconds: Math.max(
          0,
          Math.round((ts.getTime() - joinedAt.getTime()) / 1000)
        ),
      });
      joinedAt = null;
      lastSeen = null;
    }
  }

  // Dangling session (no explicit leave)
  if (joinedAt && lastSeen) {
    sessions.push({
      started_at: joinedAt.toISOString(),
      ended_at: lastSeen.toISOString(),
      inferred: true,
      duration_seconds: Math.max(
        0,
        Math.round((lastSeen.getTime() - joinedAt.getTime()) / 1000)
      ),
    });
  }

  return sessions;
}

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */
const totalDuration = (sessions: Session[]) =>
  sessions.reduce((sum, s) => sum + s.duration_seconds, 0);

const firstStart = (sessions: Session[]) =>
  sessions[0]?.started_at ?? null;

const lastEnd = (sessions: Session[]) =>
  sessions.at(-1)?.ended_at ?? null;

/* ---------------------------------------------------------
   CRON HANDLER
--------------------------------------------------------- */
export async function GET(_req: NextRequest) {
  try {
    /* -----------------------------------------------------
       1️⃣ Fetch audit logs
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
       2️⃣ Group by appointment
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
         Group events by role
      ----------------------------------------------- */
      const byRole: Record<Role, AuditEvent[]> = {
        practitioner: [],
        patient: [],
        guest: [],
        unknown: [],
      };

      for (const e of events) {
        const role = e.metadata?.role ?? "unknown";
        byRole[role].push(e);
      }

      /* -----------------------------------------------
         Build sessions
      ----------------------------------------------- */
      const practitionerSessions = buildSessions(byRole.practitioner);
      const patientSessions = buildSessions(byRole.patient);

      /* -----------------------------------------------
         Participant summary
      ----------------------------------------------- */
      const participantSummary = {
        practitioner: {
          sessions: practitionerSessions,
          started_at: firstStart(practitionerSessions),
          ended_at: lastEnd(practitionerSessions),
          total_duration_seconds: totalDuration(practitionerSessions),
          session_count: practitionerSessions.length,
        },
        patient: {
          sessions: patientSessions,
          started_at: firstStart(patientSessions),
          ended_at: lastEnd(patientSessions),
          total_duration_seconds: totalDuration(patientSessions),
          session_count: patientSessions.length,
        },
      };

      /* -----------------------------------------------
         Meeting lifecycle (defined by practitioner)
      ----------------------------------------------- */
      const meetingStartedAt =
        participantSummary.practitioner.started_at;

      const meetingEndedAt =
        participantSummary.practitioner.ended_at;

      const meetingDurationSeconds =
        meetingStartedAt && meetingEndedAt
          ? Math.round(
              (new Date(meetingEndedAt).getTime() -
                new Date(meetingStartedAt).getTime()) /
                1000
            )
          : null;

      /* -----------------------------------------------
         Persist audit summary
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
         No-show logic (ONLY after scheduled end)
      ----------------------------------------------- */
      if (
        appointment.ends_at &&
        Date.now() >= new Date(appointment.ends_at).getTime()
      ) {
        const practitionerJoined =
          participantSummary.practitioner.session_count > 0;
        const patientJoined =
          participantSummary.patient.session_count > 0;

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
            call_ended_at:
              meetingEndedAt ?? new Date().toISOString(),
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
    return NextResponse.json(
      { error: "Cron failed" },
      { status: 500 }
    );
  }
}
