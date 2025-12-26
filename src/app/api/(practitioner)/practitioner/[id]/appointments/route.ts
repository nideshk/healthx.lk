import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

function getDurationInMinutes(
  startsAt: string,
  endsAt: string
): number {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  return Math.max(0, Math.round((end - start) / 60000));
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  // 🔐 AUTH
  const { authorized, response, user } = await requireUser();
  if (!authorized) return response;

  const role = user?.profile?.role;
  if (role !== "admin" && role !== "superadmin") {
    return NextResponse.json(
      { success: false, message: "Access denied" },
      { status: 403 }
    );
  }

  // 🧩 AWAIT PARAMS
  const { id: practitionerId } = await context.params;

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
    return NextResponse.json(
      { success: false, message: "Invalid query parameters" },
      { status: 400 }
    );
  }

  // 📡 SUPABASE ADMIN CALL (SAME PATTERN AS YOUR EXAMPLE)
  const { data, error } = await supabaseAdmin
    .from("appointments")
    .select(`
        id,
        starts_at,
        ends_at,
        status,
        notes,
        additional_attendees,

        patient:patients (
            full_name
        ),

        type:appointment_type (
            name
        )
    `)
    .eq("practitioner_id", practitionerId)
    .neq("status", "cancelled")
    .gte(
      "starts_at",
      view === "daily"
        ? `${date}T00:00:00`
        : `${weekStart}T00:00:00`
    )
    .lte(
      "starts_at",
      view === "daily"
        ? `${date}T23:59:59`
        : (() => {
            const end = new Date(weekStart!);
            end.setDate(end.getDate() + 6);
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

  // 📤 RESPONSE
  return NextResponse.json({
    success: true,
    data: data.map((a) => ({
      id: a.id,
      patient: a.patient?.[0]?.full_name ?? null,
      starts_at: a.starts_at,
      ends_at: a.ends_at,
      participants: 1 + (a.additional_attendees?.length || 0),
      reason: a.notes,
      status: a.status,
      duration_minutes: getDurationInMinutes(
        a.starts_at,
        a.ends_at
    )
    }))
  });
}
