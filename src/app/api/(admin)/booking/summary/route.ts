import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { auditLog } from "@/lib/audit/auditLog";
import { getAuditContext } from "@/lib/audit/getAuditContext";

export async function GET(request: NextRequest) {
  try {
    const { authorized, user, response } = await requireUser();
    if (!authorized) return response;

    /** RBAC: admin + superadmin */
    if (!user?.admin || !["admin", "superadmin"].includes(user.admin.role)) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        {
          success: false,
          message: "`from` and `to` query params are required",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("appointments")
      .select("id, status")
      .gte("starts_at", `${from}T00:00:00`)
      .lte("starts_at", `${to}T23:59:59`);

    if (error) throw error;

    let upcoming = 0;
    let completed = 0;
    let cancelled = 0;

    (data ?? []).forEach((appt) => {
      if (["scheduled", "confirmed","pending"].includes(appt.status)) {
        upcoming++;
      }

      if (appt.status === "completed") {
        completed++;
      }

      if (appt.status === "cancelled") {
        cancelled++;
      }
    });
    
    const cnx = getAuditContext(request, user);
    await auditLog({
      ...cnx,
      action      : "VIEWED",
      entityType  : "APPOINTMENT",
      purpose     : "operations",
      source      : "dashboard",
      metadata    : { stats: {
        total_bookings: upcoming + completed + cancelled,
        upcoming,
        completed,
        cancelled,
      } },
    })

    return NextResponse.json({
      success: true,
      range: { from, to },
      stats: {
        total_bookings: upcoming + completed + cancelled,
        upcoming,
        completed,
        cancelled,
      },
    });
  } catch (err: any) {
    console.error("GET /reports/appointments/summary error:", err);
    return NextResponse.json(
      { success: false, message: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
