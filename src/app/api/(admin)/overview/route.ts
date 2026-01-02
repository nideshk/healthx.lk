import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";

export const runtime = "nodejs";

const TIMEZONE = "Asia/Colombo";

export async function GET() {
  try {
    const { authorized, role } = await requireUser();

    if (!authorized || role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // -----------------------------------
    // 📅 1. Today range (local → UTC)
    // -----------------------------------
    const todayLocal = DateTime.now().setZone(TIMEZONE);
    const from = todayLocal.startOf("day").toUTC().toISO();
    const to = todayLocal.endOf("day").toUTC().toISO();

    // -----------------------------------
    // 📅 2. Fetch today appointments
    // -----------------------------------
    const { data, error } = await supabaseAdmin
      .from("appointments")
      .select(`
        id,
        starts_at,
        ends_at,
        status,
        practitioner_id,
        practitioners!inner (
          id,
          is_active,
          deleted_at
        )
      `)
      .neq("status", "cancelled")
      .gte("starts_at", from)
      .lte("ends_at", to);

    if (error) throw error;

    // -----------------------------------
    // ✅ 3. Upcoming & completed counts
    // -----------------------------------
    const upcoming = data.filter((r) => {
      const status = (r.status ?? "").toLowerCase();
      return status === "scheduled" || status === "confirmed";
    }).length;

    const completed = data.filter((r) => {
      return (r.status ?? "").toLowerCase() === "completed";
    }).length;

    // -----------------------------------
    // 👨‍⚕️ 4. Active clinicians (today)
    // -----------------------------------
    const activeClinicianSet = new Set<string>();

    for (const a of data) {
      const practitioner = Array.isArray(a.practitioners)
        ? a.practitioners[0]
        : a.practitioners;

      if (
        practitioner &&
        practitioner.is_active === true &&
        practitioner.deleted_at === null
      ) {
        activeClinicianSet.add(practitioner.id);
      }
    }

    const active_clinicians = activeClinicianSet.size;

    // -----------------------------------
    // ✅ Response
    // -----------------------------------
    return NextResponse.json({
      success: true,
      date: todayLocal.toISODate(),
      timezone: TIMEZONE,
      upcoming,
      completed,
      active_clinicians,
    });
  } catch (err: any) {
    console.error("❌ Admin today stats error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
