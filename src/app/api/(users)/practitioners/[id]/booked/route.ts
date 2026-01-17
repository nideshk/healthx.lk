import { NextRequest, NextResponse } from "next/server";
import { DateTime } from "luxon";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: practitionerId } = await context.params;
    const { searchParams } = new URL(req.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing from/to query params" },
        { status: 400 }
      );
    }

    const { user } = await requireUser(req);

    if (user?.role === "patient") {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    if (user?.role === "practitioner") {
      if (user?.practitioner_id !== practitionerId) {
        return NextResponse.json(
          { error: "You cannot view another practitioner's bookings" },
          { status: 403 }
        );
      }
    }


    const TIMEZONE = "Asia/Colombo";

    const { data, error } = await supabaseClient
      .from("appointments")
      .select("id, starts_at, ends_at, appointment_type_id, status, telehealth_url")
      .eq("practitioner_id", practitionerId)
      .neq("status", "cancelled")
      .gte("starts_at", `${from}T00:00:00Z`)
      .lte("ends_at", `${to}T23:59:59Z`)
      .order("starts_at", { ascending: true });

    if (error) throw error;

    const scheduledCount = data.filter((r) => {
      const status = (r.status ?? "").toString().toLowerCase();
      return status === "scheduled" || status === "confirmed";
    }).length;

    const completedCount = data.filter((r) => {
      const status = (r.status ?? "").toString().toLowerCase();
      return status === "completed";
    }).length;

    const booked = data.map((a) => {
      const startLocal = DateTime.fromISO(a.starts_at).setZone(TIMEZONE);
      const endLocal = DateTime.fromISO(a.ends_at).setZone(TIMEZONE);

      return {
        id: a.id,
        from: startLocal.toFormat("HH:mm"),
        to: endLocal.toFormat("HH:mm"),
        date: startLocal.toFormat("yyyy-MM-dd"),
        appointment_type: a.appointment_type_id,
        telehealth_url: a.telehealth_url,
        status: a.status
      };
    });

    const cnx = getAuditContext(req, user);

    await auditLog({
      ...cnx,
      action: "VIEWED",
      entityType: "PRACTITIONER",
      entityId: practitionerId,
      purpose: "operations",
      source: "dashboard",
      metadata: {
        practitioner_id: practitionerId,
        range: { from, to },
        total: booked.length
      }
    })

    return NextResponse.json({
      success: true,
      role: user?.role,
      practitioner_id: practitionerId,
      range: { from, to },
      total: booked.length,
      timezone: TIMEZONE,
      booked,
      scheduled_count: scheduledCount, // scheduled for that range (dashboard left)
      completed_count: completedCount,
    });
  } catch (err: any) {
    console.error("❌ Error in booked endpoint:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
