import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
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

    const { authorized, role } = await requireUser();

    if (!authorized) {
      return NextResponse.json(
        { error: "You are not authorized." },
        { status: 401 }
      );
    }

    /** RBAC */
    const allowedRoles = ["admin", "superadmin"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "You do not have permission to view appointments." },
        { status: 403 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("appointments")
      .select(
        `
          id,
          starts_at,
          ends_at,
          status,
          practitioner:practitioner_id!inner (
            id,
            full_name
          )
        `
      )
      .eq("patient_id", patientId)
      .in("status", ["scheduled", "confirmed", "completed"])
      .order("starts_at", { ascending: false });

    if (error) throw error;

    const scheduled: any[] = [];
    const completed: any[] = [];

    (data ?? []).forEach((appt: any) => {
      const startsAt = new Date(appt.starts_at);

      const appointment_date = startsAt.toISOString().split("T")[0];
      const start_time = startsAt.toISOString().split("T")[1].slice(0, 5); // HH:mm

      const item = {
        id: appt.id,
        appointment_date,
        start_time,
        doctor: {
          id: appt.practitioner.id,
          name: appt.practitioner.full_name,
        },
      };

      if (appt.status === "scheduled" || appt.status === "confirmed") {
        scheduled.push(item);
      }

      if (appt.status === "completed") {
        completed.push(item);
      }
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
