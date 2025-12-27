import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/* ---------------------------------------------------------
   Types
--------------------------------------------------------- */
type AuditEvent = {
  appointment_id: string;
  event_type: "joined_call" | "left_call" | "heartbeat";
  created_at: string;
  metadata: { role?: "patient" | "practitioner" | "guest" };
};

/* ---------------------------------------------------------
   Utilities
--------------------------------------------------------- */

// Rejoin + crash safe duration calculator
function calculateDuration(events: AuditEvent[]) {
  let total = 0;
  let joinedAt: Date | null = null;

  for (const e of events) {
    const ts = new Date(e.created_at);

    if (e.event_type === "joined_call") {
      if (!joinedAt) joinedAt = ts;
    }

    if (e.event_type === "left_call" && joinedAt) {
      total += (ts.getTime() - joinedAt.getTime()) / 1000;
      joinedAt = null;
    }
  }

  return Math.round(total);
}

/* ---------------------------------------------------------
   CRON HANDLER
--------------------------------------------------------- */
export async function GET(_req: NextRequest) {
  try {
    /* ---------------------------------------------------------
       1️⃣ Fetch audit logs (ordered)
    --------------------------------------------------------- */
    const { data: logs, error } = await supabaseAdmin
      .from("consultation_audit_log")
      .select("appointment_id, event_type, created_at, metadata")
      .order("created_at", { ascending: true });

    if (error) throw error;
    if (!logs || logs.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    /* ---------------------------------------------------------
       2️⃣ Group logs by appointment
    --------------------------------------------------------- */
    const grouped: Record<string, AuditEvent[]> = {};

    for (const log of logs as AuditEvent[]) {
      grouped[log.appointment_id] ||= [];
      grouped[log.appointment_id].push(log);
    }

    let processed = 0;

    /* ---------------------------------------------------------
       3️⃣ Process each appointment
    --------------------------------------------------------- */
    for (const appointmentId of Object.keys(grouped)) {
      const events = grouped[appointmentId];

      const byRole: Record<string, AuditEvent[]> = {};
      for (const e of events) {
        const role = e.metadata?.role ?? "unknown";
        byRole[role] ||= [];
        byRole[role].push(e);
      }

      const practitionerEvents = byRole["practitioner"] || [];
      const patientEvents = byRole["patient"] || [];

      /* ---------------------------------------------------------
         4️⃣ Practitioner defines meeting lifecycle
      --------------------------------------------------------- */
      const practitionerJoins = practitionerEvents.filter(
        e => e.event_type === "joined_call"
      );
      const practitionerLeaves = practitionerEvents.filter(
        e => e.event_type === "left_call"
      );

      const meetingStartedAt =
        practitionerJoins[0]?.created_at ?? null;

      const meetingEndedAt =
        practitionerLeaves.at(-1)?.created_at ?? null;

      const meetingDurationSeconds =
        meetingStartedAt && meetingEndedAt
          ? Math.round(
              (new Date(meetingEndedAt).getTime() -
                new Date(meetingStartedAt).getTime()) / 1000
            )
          : null;

      /* ---------------------------------------------------------
         5️⃣ Participant summary
      --------------------------------------------------------- */
      const participantSummary = {
        practitioner: {
          started_at: practitionerJoins[0]?.created_at ?? null,
          ended_at: practitionerLeaves.at(-1)?.created_at ?? null,
          duration_seconds: calculateDuration(practitionerEvents),
          event_count: practitionerEvents.filter(
            e => e.event_type !== "heartbeat"
          ).length,
        },
        patient: {
          started_at:
            patientEvents.find(e => e.event_type === "joined_call")
              ?.created_at ?? null,
          ended_at:
            patientEvents.filter(e => e.event_type === "left_call").at(-1)
              ?.created_at ?? null,
          duration_seconds: calculateDuration(patientEvents),
          event_count: patientEvents.filter(
            e => e.event_type !== "heartbeat"
          ).length,
        },
      };

      /* ---------------------------------------------------------
         6️⃣ Persist audit summary
      --------------------------------------------------------- */
      await supabaseAdmin
        .from("consultation_audit_summary")
        .upsert(
          {
            appointment_id: appointmentId,
            meeting_started_at: meetingStartedAt,
            meeting_ended_at: meetingEndedAt,
            meeting_duration_seconds: meetingDurationSeconds,
            participant_summary: participantSummary,
            event_timeline: events,
            last_processed_at: new Date().toISOString(),
            call_ended_at: meetingEndedAt,
          },
          { onConflict: "appointment_id" }
        );

      /* ---------------------------------------------------------
         7️⃣ Update appointment status (ONLY after meeting ends)
      --------------------------------------------------------- */
      if (meetingEndedAt) {
        const practitionerJoined =
          participantSummary.practitioner.started_at !== null;
        const patientJoined =
          participantSummary.patient.started_at !== null;

        let practitionerNoShow = false;
        let patientNoShow = false;
        let status = "completed";

        if (!practitionerJoined && patientJoined) {
          practitionerNoShow = true;
          status = "cancelled";
        }

        if (!patientJoined && practitionerJoined) {
          patientNoShow = true;
          status = "cancelled";
        }

        if (!patientJoined && !practitionerJoined) {
          practitionerNoShow = true;
          patientNoShow = true;
          status = "cancelled";
        }

        await supabaseAdmin
          .from("appointments")
          .update({
            practitioner_no_show: practitionerNoShow,
            patient_no_show: patientNoShow,
            call_ended_at: meetingEndedAt,
            status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", appointmentId)
          .is("call_ended_at", null); // idempotent
      }

      processed++;
    }

    return NextResponse.json({
      success: true,
      processed,
    });
  } catch (err) {
    console.error("❌ Consultation finalizer cron failed:", err);
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 }
    );
  }
}
