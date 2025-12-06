import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";

/**
 * GET /api/practitioner/[id]/analytics?from=2025-12-01&to=2025-12-05
 *
 * Returns appointment & transaction aggregates for the practitioner.
 *
 * Notes:
 * - `from` and `to` are optional ISO date strings (e.g. 2025-12-01 or 2025-12-01T00:00:00Z).
 * - `from` is inclusive; `to` is inclusive (end of day).
 * - upcoming = appointments with starts_at > now() and status NOT cancelled/completed.
 */

type Result = {
  total_bookings: number;
  completed: number;
  cancelled: number;
  refunds_requested: number; // count of refund transactions or refund requests
  refund_amount: number;     // NEW: total refunded amount (sum)
  upcoming: number;
  total_revenue: number; // number in same units as transactions.amount (credits - refunds)
};

function parseDateInput(val: string | null) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d;
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }){
  const { id: practitionerId } = await context.params;
  if (!practitionerId) return NextResponse.json({ error: "Missing practitioner id" }, { status: 400 });

  // allow optional query params
  const url = new URL(req.url);
  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");

  const fromDate = parseDateInput(fromRaw);
  let toDate = parseDateInput(toRaw);
  // make `to` inclusive by extending to end of day if user provided only YYYY-MM-DD
  if (toDate && toRaw && /^\d{4}-\d{2}-\d{2}$/.test(toRaw)) {
    // set to end of day (local JS Date mutated; we'll use ISO below)
    toDate.setUTCHours(23, 59, 59, 999);
  }

  // Auth: only practitioner (self) or admin/support can get analytics
  const { authorized, user, role } = await requireUser();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isPractitionerSelf = user?.practitioner_id === practitionerId;
  const isAdminOrSupport = ["admin"].includes(role);
  if (!isPractitionerSelf && !isAdminOrSupport) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Build base queries with optional date filters
    const appointmentBase = supabaseAdmin.from("appointments").select("id", { count: "exact" });
    const appointmentCompleted = supabaseAdmin.from("appointments").select("id", { count: "exact" });
    const appointmentCancelled = supabaseAdmin.from("appointments").select("id", { count: "exact" });

    // apply practitioner filter
    appointmentBase.eq("practitioner_id", practitionerId);
    appointmentCompleted.eq("practitioner_id", practitionerId).eq("status", "completed");
    appointmentCancelled.eq("practitioner_id", practitionerId).eq("status", "cancelled");

    // apply date filters to appointment queries (counts within range)
    if (fromDate) {
      appointmentBase.gte("starts_at", fromDate.toISOString());
      appointmentCompleted.gte("starts_at", fromDate.toISOString());
      appointmentCancelled.gte("starts_at", fromDate.toISOString());
    }
    if (toDate) {
      appointmentBase.lte("starts_at", toDate.toISOString());
      appointmentCompleted.lte("starts_at", toDate.toISOString());
      appointmentCancelled.lte("starts_at", toDate.toISOString());
    }

    // upcoming appointments: starts_at > now() and status not cancelled/completed (or status in scheduled/confirmed)
    const nowIso = new Date().toISOString();
    const upcomingQuery = supabaseAdmin
      .from("appointments")
      .select("id", { count: "exact" })
      .eq("practitioner_id", practitionerId)
      .gt("starts_at", nowIso)
      // exclude cancelled/completed
      .not("status", "in", `('cancelled','completed')`);

    // Transactions: filter by practitioner and optional date range
    // We'll request amount and status so we can compute refund_amount and revenue
    const txQuery = supabaseAdmin
      .from("transactions")
      .select("id, amount, status, created_at", { count: "exact" })
      .eq("practitioner_id", practitionerId);

    if (fromDate) txQuery.gte("created_at", fromDate.toISOString());
    if (toDate) txQuery.lte("created_at", toDate.toISOString());

    // Run queries in parallel
    const [
      apptBaseRes,
      apptCompletedRes,
      apptCancelledRes,
      upcomingRes,
      txRes,
    ] = await Promise.all([
      appointmentBase,
      appointmentCompleted,
      appointmentCancelled,
      upcomingQuery,
      txQuery,
    ]);

    if (apptBaseRes.error) throw apptBaseRes.error;
    if (apptCompletedRes.error) throw apptCompletedRes.error;
    if (apptCancelledRes.error) throw apptCancelledRes.error;
    if (upcomingRes.error) throw upcomingRes.error;
    if (txRes.error) throw txRes.error;

    const total_bookings = Number(apptBaseRes.count ?? 0);
    const completed = Number(apptCompletedRes.count ?? 0);
    const cancelled = Number(apptCancelledRes.count ?? 0);
    const upcoming = Number(upcomingRes.count ?? 0);

    const txRows = (txRes.data ?? []) as Array<{ amount: string | number; status: string }>;

    // compute revenue: completed - refunds
    // treat statuses case-insensitively; consider 'COMPLETED' as revenue, statuses containing 'REFUND' as refund.
    let revenueCredit = 0; // sum of completed amounts
    let revenueRefund = 0; // sum of refunded amounts
    let refunds_requested = 0;

    for (const tx of txRows) {
      const amountNum = typeof tx.amount === "string" ? parseFloat(tx.amount) : Number(tx.amount || 0);
      const status = (tx.status || "").toString().toUpperCase();

      if (status === "COMPLETED") {
        revenueCredit += Number.isFinite(amountNum) ? amountNum : 0;
      } else if (status.includes("REFUND")) {
        // includes REFUNDED, REFUND, REFUND_REQUESTED, etc.
        revenueRefund += Number.isFinite(amountNum) ? amountNum : 0;
        refunds_requested += 1;
      } else if (status === "PENDING_REFUND" || status === "REFUND_REQUESTED") {
        refunds_requested += 1;
      }
      // other statuses (PENDING / FAILED) ignored for revenue
    }

    const total_revenue = Number((revenueCredit - revenueRefund) || 0);
    const refund_amount = Number(revenueRefund || 0); // NEW: total refunded amount

    const result: Result = {
      total_bookings,
      completed,
      cancelled,
      refunds_requested,
      refund_amount,     // <-- included in response
      upcoming,
      total_revenue,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("analytics error:", err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
