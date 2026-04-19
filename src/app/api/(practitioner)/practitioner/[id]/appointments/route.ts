import { auditLog } from "@/lib/audit/auditLog";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { email } from "zod";

function getDurationInMinutes(
  startsAt: string,
  endsAt: string
): number {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  return Math.max(0, Math.round((end - start) / 60000));
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // 🔐 AUTH
  const { authorized, user } = await requireUser(req);
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cnx = getAuditContext(req, user);
  const { id: practitionerId } = await context.params;

  const role = user?.profile?.role;
  if (role !== "admin" && role !== "superadmin" && !(
    role === "practitioner" &&
    user?.practitioner_id === practitionerId
  )) {

    await auditLog(
      {
        ...cnx,
        action: "DENIED",
        entityType: "APPOINTMENT",
        entityId: practitionerId,
        purpose: "operations",
        source: "dashboard",
        metadata: {
          reason: "insufficient_privileges"
        }

      }
    );

    return NextResponse.json(
      { success: false, message: "Access denied" },
      { status: 403 }
    );
  }
  // 🔍 QUERY PARAMS
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view");
  const date = searchParams.get("date");
  const weekStart = searchParams.get("week_start");

  if (
    !view ||
    (view === "daily" && !date) ||
    (view === "weekly" && !weekStart)
  ) {
    if (view !== "upcoming_8_days") {
      return NextResponse.json(
        { success: false, message: "Invalid query parameters" },
        { status: 400 }
      );
    }
  }

  // 📡 SUPABASE ADMIN CALL (SAME PATTERN AS YOUR EXAMPLE)
  const { data, error } = await supabaseAdmin
    .from("appointments")
    .select(`
        id,
        patient_id,
        starts_at,
        ends_at,
        status,
        notes,
        additional_attendees,
        room_key,

        patient:patients (
            id,
            full_name,
            email,
            contact_number
        ),

        type:appointment_type (
            name
        )
    `)
    .eq("practitioner_id", practitionerId)
    .in("status", ["confirmed", "completed"])
    .gte(
      "starts_at",
      view === "upcoming_8_days"
        ? (() => {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            return start.toISOString();
          })()
        : view === "daily"
        ? `${date}T00:00:00`
        : `${weekStart}T00:00:00`
    )
    .lte(
      "starts_at",
      view === "upcoming_8_days"
        ? (() => {
            const end = new Date();
            end.setDate(end.getDate() + 8); // Start of day 8 means end of day 7
            end.setHours(0, 0, 0, 0);
            return end.toISOString();
          })()
        : view === "daily"
        ? `${date}T23:59:59`
        : (() => {
          const end = new Date(weekStart!);
          end.setDate(end.getDate() + 7);
          return end.toISOString();
        })()
    )
    .order("starts_at");

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
  const confirmedCount = data.filter(
    (a) => a.status === "confirmed"
  ).length;

  const completedCount = data.filter(
    (a) => a.status === "completed"
  ).length;

  await auditLog(
    {
      ...cnx,
      action: "VIEWED",
      entityType: "APPOINTMENT",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        counts: {
          confirmed: confirmedCount,
          completed: completedCount,
        },
        data: data.map((a) => ({
          id: a.id,
          patient_id: a.patient_id,
          patient: (a.patient as unknown as { full_name: string } | null)?.full_name ?? null,
          appointment_type: (a.type as unknown as { name: string } | null)?.name ?? null,
          starts_at: a.starts_at,
          ends_at: a.ends_at,
          participants: 1 + (a.additional_attendees?.length || 0),
          reason: a.notes,
          room_key: a.room_key,
          status: a.status,
          duration_minutes: getDurationInMinutes(
            a.starts_at,
            a.ends_at
          )
        }))
      }

    }
  );
  // 📤 RESPONSE
  return NextResponse.json({
    success: true,
    counts: {
      confirmed: confirmedCount,
      completed: completedCount,
    },
    data: data.map((a) => ({
      id: a.id,
      patient_id: a.patient_id,
      patient: (a.patient as unknown as { full_name: string } | null)?.full_name ?? null,
      email: (a.patient as unknown as { email: string } | null)?.email ?? null,
      contact_number: (a.patient as unknown as { contact_number: string } | null)?.contact_number ?? null,
      appointment_type: (a.type as unknown as { name: string } | null)?.name ?? null,
      starts_at: a.starts_at,
      ends_at: a.ends_at,
      participants: 1 + (a.additional_attendees?.length || 0),
      reason: a.notes,
      room_key: a.room_key,
      status: a.status,
      duration_minutes: getDurationInMinutes(
        a.starts_at,
        a.ends_at
      )
    }))
  });
}
