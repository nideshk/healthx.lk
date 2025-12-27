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
      .in("status", ["scheduled", "confirmed"]);

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

    let refund_amount = 0;
    let refunds_requested = 0;

    for (const tx of txRows) {
      const amountNum =
        typeof tx.amount === "string"
          ? parseFloat(tx.amount)
          : Number(tx.amount || 0);

      const status = (tx.status || "").toString().toUpperCase();

      if (
        status === "REFUNDED" ||
        status === "REFUND" ||
        status === "REFUND_REQUESTED" ||
        status === "PENDING_REFUND"
      ) {
        refunds_requested += 1;

        if (Number.isFinite(amountNum)) {
          refund_amount += amountNum;
        }
      }
    }

    const result: Result = {
      total_bookings,
      completed,
      cancelled,
      refunds_requested,
      refund_amount,
      upcoming,
    };

    return NextResponse.json(result, { status: 200 });

  } catch (err: any) {
    console.error("analytics error:", err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
