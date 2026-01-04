import { auditLog } from "@/lib/audit/auditLog";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patientId } = await context.params;

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient identifier is required." },
        { status: 400 }
      );
    }

    const { authorized, role , user } = await requireUser();

    if (!authorized) {
      return NextResponse.json(
        { error: "You are not authorized." },
        { status: 401 }
      );
    }

    const allowedRoles = ["admin", "superadmin"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "You do not have permission to view appointments." },
        { status: 403 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("appointments")
      .select(`
        id,
        starts_at,
        ends_at,
        status,
        practitioner:practitioner_id (
          id,
          full_name
        ),
        appointment_type:appointment_type!fk_appointments_type (
          id,
          name
        )
      `)
      .eq("patient_id", patientId)
      .in("status", ["scheduled", "confirmed", "completed","pending"])
      .order("starts_at", { ascending: false });

    if (error) throw error;

    const scheduled: any[] = [];
    const completed: any[] = [];

    (data ?? []).forEach((appt: any) => {
      const startsAt = new Date(appt.starts_at);
      // Local date (YYYY-MM-DD)
      const appointment_date = new Date(
        startsAt.getTime() - startsAt.getTimezoneOffset() * 60000
      )
        .toISOString()
        .split("T")[0];

      // Local time with AM/PM
      const start_time = startsAt.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });


      const item = {
        id: appt.id,
        appointment_date,
        start_time,
        doctor: {
          id: appt.practitioner.id,
          name: appt.practitioner.full_name,
        },
        appointment_type: appt.appointment_type
        ? {
            id: appt.appointment_type.id,
            name: appt.appointment_type.name,
          }
        : null,
      };

      if (appt.status === "scheduled" || appt.status === "confirmed" || appt.status === "pending") {
        scheduled.push(item);
      }

      if (appt.status === "completed") {
        completed.push(item);
      }
    });

    const cnx = getAuditContext(request, user);

    await auditLog({
      ...cnx,
      action: "VIEWED",
      entityType: "APPOINTMENT",
      entityId: patientId,
      purpose: "operations",
      source: "user_portal",
      metadata: { patientId , total_appointments: data.length, scheduled: scheduled.length, completed: completed.length }
    });

    return NextResponse.json({
      scheduled,
      completed,
    });
  } catch (err: any) {
    console.error("GET /patients/:id/appointments error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unable to fetch appointments." },
      { status: 500 }
    );
  }
}
