import { NextRequest, NextResponse } from "next/server";
import { DateTime } from "luxon";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

export const runtime = "nodejs";

const TIMEZONE = "Asia/Colombo";

export async function GET(req: NextRequest) {
  try {
    const { authorized, role, user } = await requireUser(req);
    const cnx = getAuditContext(req, user);
    if (!authorized || (role !== "admin" && role !== "superadmin")) {
      await auditLog({
        ...cnx,
        action: "FAILED_ACCESS",
        entityType: "APPOINTMENT",
        purpose: "operations",
        source: "dashboard",
        metadata: {
          reason: "unauthorized_dashboard_summary_access",
          role,
        },
      });
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
      .lt("starts_at", to)
      .order("created_at", { ascending: false })


    if (error) {
      await auditLog({
        ...cnx,
        action: "FAILED",
        entityType: "APPOINTMENT",
        purpose: "operations",
        source: "dashboard",
        metadata: {
          reason: "failed_to_fetch_today_appointments",
        },
      });
      throw error;
    }

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

    await auditLog({
      ...cnx,
      action: "VIEWED",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        success: true,
        date: todayLocal.toISODate(),
        timezone: TIMEZONE,
        upcoming,
        completed,
        active_clinicians,
      }
    });

    return NextResponse.json({
      success: true,
      date: todayLocal.toISODate(),
      timezone: TIMEZONE,
      upcoming,
      completed,
      active_clinicians,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
