import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

/* -----------------------------------------------------------
   Utility: convert a local date/time (YYYY-MM-DD + "HH:MM") in a timezone into UTC ISO
   Uses Intl to infer timezone offset for that date/time.
------------------------------------------------------------- */
function localDateTimeToUtcIso(dateStr: string, timeStr: string, timeZone: string) {
  const [y, m, d] = dateStr.split("-").map((s) => parseInt(s, 10));
  const [hh, mm] = timeStr.split(":").map((s) => parseInt(s, 10) || 0);

  const asUtc = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(asUtc).reduce((acc: any, p: any) => {
    acc[p.type] = p.value;
    return acc;
  }, {});

  const tzY = parseInt(parts.year, 10);
  const tzM = parseInt(parts.month, 10);
  const tzD = parseInt(parts.day, 10);
  const tzH = parseInt(parts.hour, 10);
  const tzMin = parseInt(parts.minute, 10);
  const tzS = parseInt(parts.second, 10);

  const tzEpoch = Date.UTC(tzY, tzM - 1, tzD, tzH, tzMin, tzS);
  const offsetMinutes = Math.round((tzEpoch - asUtc.getTime()) / 60000);

  const localEpoch = Date.UTC(y, m - 1, d, hh, mm, 0);
  const utcEpoch = localEpoch - offsetMinutes * 60 * 1000;
  return new Date(utcEpoch).toISOString();
}

/* -----------------------------------------------------------
   Utility: compute UTC windows based on leave type
   Expects an availability shape with starts_at_local / ends_at_local / timezone
------------------------------------------------------------- */
function buildWindowsForDate(
  date: string,
  av: { starts_at_local: string; ends_at_local: string; timezone?: string },
  leaveType: string
) {
  const timezone = av.timezone || "UTC";
  const startLocal = av.starts_at_local; // "HH:MM"
  const endLocal = av.ends_at_local; // "HH:MM"

  if (!startLocal || !endLocal) return [];

  const [sH, sM] = startLocal.split(":").map(Number);
  const [eH, eM] = endLocal.split(":").map(Number);
  const startMinutes = sH * 60 + (sM || 0);
  const endMinutes = eH * 60 + (eM || 0);
  if (startMinutes >= endMinutes) return [];

  const midMinutes = Math.floor((startMinutes + endMinutes) / 2);
  const midLocal = `${String(Math.floor(midMinutes / 60)).padStart(2, "0")}:${String(midMinutes % 60).padStart(2, "0")}`;

  if (leaveType === "full_day") {
    return [{ from: localDateTimeToUtcIso(date, startLocal, timezone), to: localDateTimeToUtcIso(date, endLocal, timezone) }];
  }
  if (leaveType === "first_half") {
    return [{ from: localDateTimeToUtcIso(date, startLocal, timezone), to: localDateTimeToUtcIso(date, midLocal, timezone) }];
  }
  if (leaveType === "second_half") {
    return [{ from: localDateTimeToUtcIso(date, midLocal, timezone), to: localDateTimeToUtcIso(date, endLocal, timezone) }];
  }
  return [];
}

/* -----------------------------------------------------------
   helpers for date iteration & weekday name
------------------------------------------------------------- */
function iterateDates(startYmd: string, endYmd: string) {
  const out: string[] = [];
  const cur = new Date(startYmd + "T00:00:00Z");
  const end = new Date(endYmd + "T00:00:00Z");
  for (let dt = new Date(cur); dt <= end; dt.setUTCDate(dt.getUTCDate() + 1)) {
    out.push(dt.toISOString().slice(0, 10));
  }
  return out;
}

function weekdayNameForDate(dateYmd: string, timeZone: string) {
  const dt = new Date(dateYmd + "T00:00:00Z");
  return dt.toLocaleDateString("en-US", { weekday: "long", timeZone }).toLowerCase();
}

/* -----------------------------------------------------------
   GET handler
------------------------------------------------------------- */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: practitionerId } = await context.params;
    if (!practitionerId) return NextResponse.json({ error: "Practitioner identifier is required." }, { status: 400 });

    const { authorized, user, role } = await requireUser();
    if (!authorized) return NextResponse.json({ error: "You are not authorized to access this resource." }, { status: 401 });

    const isSelf = user?.practitioner_id === practitionerId;
    const isAdmin = ["admin", "superadmin"].includes(role);
    if (!isSelf && !isAdmin) return NextResponse.json({ error: "You do not have permission to view leave records for this practitioner." }, { status: 403 });

    /** 👉 Read query params */
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query = supabaseAdmin
      .from("practitioner_leaves")
      .select("*")
      .eq("practitioner_id", practitionerId);

    if (startDate) {
      query = query.gte("start_date", startDate);
    }

    if (endDate) {
      query = query.lte("end_date", endDate);
    }

    const { data, error } = await query.order("start_date", { ascending: true });

    if (error) throw error;

       const cnx = getAuditContext(request, user);
    
        await auditLog({
          ...cnx,
          action: "VIEWED",
          entityType: "PRACTITIONER",
          entityId: practitionerId,
          purpose: "operations",
          source: "dashboard",
          metadata: {
            leaves : data ?? []
          }
        })
    

    return NextResponse.json({ leaves: data ?? [] });
  } catch (err: any) {
    console.error("GET /leaves error:", err);
    return NextResponse.json({ error: err?.message ?? "Unable to fetch leave records. Please try again." }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   POST handler
   Body: { start_date, end_date, leave_type, reason, force }
------------------------------------------------------------- */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: practitionerId } = await context.params;
    if (!practitionerId) return NextResponse.json({ error: "Practitioner identifier is required." }, { status: 400 });

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid request body. Please provide valid JSON." }, { status: 400 });

    const { start_date, end_date, leave_type, reason, force } = body;
    if (!start_date || !end_date || !leave_type) {
      return NextResponse.json({ error: "Some required information is missing. Please provide start date, end date, and leave type." }, { status: 400 });
    }
    if (!["full_day", "first_half", "second_half"].includes(leave_type)) {
      return NextResponse.json({ error: "The selected leave type is not valid." }, { status: 400 });
    }
    if ((leave_type === "first_half" || leave_type === "second_half") && start_date !== end_date) {
      return NextResponse.json({ error: "Half-day leave can be applied only for a single date. Please select the same day for start and end." }, { status: 400 });
    }

    // enforce one-month window from "today" (UTC)
    function ymdFromDateUTC(d: Date) {
      return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
    }

    const todayUtc = new Date();
    const todayYmd = ymdFromDateUTC(todayUtc);

    // build max allowed date = today + 1 month (preserve day-of-month where possible)
    const maxDate = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate()));
    maxDate.setUTCMonth(maxDate.getUTCMonth() + 1);
    const maxYmd = ymdFromDateUTC(maxDate);

    // If you want strict 30 days instead of "same day next month", use:
    // const maxDate = new Date(Date.now() + 30*24*60*60*1000);

    if (start_date < todayYmd || start_date > maxYmd || end_date < todayYmd || end_date > maxYmd) {
      return NextResponse.json({
        error: "Leave must be within one month from today.",
        explanation: `You may apply leave for dates between ${todayYmd} and ${maxYmd}.`
      }, { status: 400 });
    }

    const { authorized, user } = await requireUser();
    if (!authorized || user?.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: "You are not authorized to apply leave for this profile." }, { status: 403 });
    }

    // fetch practitioner's availability row
    const { data: availability, error: availErr } = await supabaseAdmin
      .from("practitioner_availability")
      .select("id, practitioner_id, starts_at, ends_at, days_unavailable, timezone")
      .eq("practitioner_id", practitionerId)
      .limit(1)
      .maybeSingle();

    if (availErr) throw availErr;
    if (!availability) return NextResponse.json({ error: "Your working hours are not configured, so leave cannot be applied. Please update your availability first." }, { status: 400 });

    // compute local HH:MM from stored starts_at/ends_at using availability.timezone
    const formatParts = (ts: string | Date, tz: string) => {
      const dt = typeof ts === "string" ? new Date(ts) : ts;
      const parts = dt.toLocaleTimeString("en-GB", { hour12: false, timeZone: tz }).split(":");
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    };

    const starts_at_local = formatParts(availability.starts_at, availability.timezone || "UTC");
    const ends_at_local = formatParts(availability.ends_at, availability.timezone || "UTC");

    // build windows per date
    const dates = iterateDates(start_date, end_date);
    const applied_windows: Array<{ date: string; windows: Array<{ from: string; to: string }> }> = [];

    for (const dateYmd of dates) {
      const weekday = weekdayNameForDate(dateYmd, availability.timezone || "UTC");
      const daysUnavailable = Array.isArray(availability.days_unavailable)
        ? availability.days_unavailable.map((s: string) => String(s).toLowerCase())
        : [];
      if (daysUnavailable.includes(weekday)) {
        return NextResponse.json({ error: "You cannot apply leave on this day because it is already marked as a non-working day." }, { status: 400 });
      }

      const windows = buildWindowsForDate(dateYmd, { starts_at_local, ends_at_local, timezone: availability.timezone }, leave_type);
      if (!windows || windows.length === 0) {
        return NextResponse.json({ error: "No working availability is configured for the selected date." }, { status: 400 });
      }
      applied_windows.push({ date: dateYmd, windows });
    }

    // collect conflicts
    const { data: appts, error: apptErr } = await supabaseAdmin
  .from("appointments")
  .select(`
    id,
    starts_at,
    ends_at,
    status,
    patient:patients (
      id,
      full_name,
      email
    )
  `)
  .eq("practitioner_id", practitionerId)
  .in("status", ["scheduled", "confirmed"]);

    if (apptErr) throw apptErr;

    const conflictWindows = applied_windows.flatMap((d) => d.windows);

    const conflicts = (appts ?? []).filter((appt: any) => {
      const aStart = new Date(appt.starts_at).getTime();
      const aEnd = new Date(appt.ends_at).getTime();
      return conflictWindows.some((w) => {
        const wStart = new Date(w.from).getTime();
        const wEnd = new Date(w.to).getTime();
        return aStart < wEnd && aEnd > wStart;
      });
    });

    if (conflicts.length > 0 && !force) {
      return NextResponse.json({
        warning: "There are scheduled appointments during this leave period. You can still apply the leave, but those appointments will be cancelled.",
        explanation: "To continue and cancel the affected appointments, resubmit with force set to true.",
        conflicts
      }, { status: 409 });
    }

    let cancelledAppointments: any[] = [];
    if (conflicts.length > 0 && Boolean(force)) {
      const ids = conflicts.map((c: any) => c.id);
      const { data: cancelled, error: cancelErr } = await supabaseAdmin
        .from("appointments")
        .update({
          status: "cancelled",
          cancellation_reason: "Cancelled due to practitioner leave",
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in("id", ids)
        .select();

      if (cancelErr) throw cancelErr;
      cancelledAppointments = cancelled ?? [];
      // Optionally notify patients here
    }

    // insert leave including applied_windows
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("practitioner_leaves")
      .insert([{
        practitioner_id: practitionerId,
        start_date,
        end_date,
        leave_type,
        reason: reason ?? null,
        applied_windows
      }])
      .select()
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json({
      success: true,
      leave: inserted,
      cancelled_appointments: cancelledAppointments
    }, { status: 201 });
  } catch (err: any) {
    console.error("POST /leaves error:", err);
    return NextResponse.json({ error: err?.message ?? "An unexpected error occurred while applying leave. Please try again." }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   DELETE handler
   Expects ?leave_id=... query param
------------------------------------------------------------- */
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> })  {
  try {
    const { id: practitionerId } = await context.params;
    if (!practitionerId) return NextResponse.json({ error: "Practitioner identifier is required." }, { status: 400 });

    const url = new URL(request.url);
    const leaveId = url.searchParams.get("leave_id");
    if (!leaveId) return NextResponse.json({ error: "Leave ID is required to delete a leave entry." }, { status: 400 });

    const { authorized, user } = await requireUser();
    if (!authorized || user?.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: "You are not authorized to delete this leave entry." }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from("practitioner_leaves")
      .delete()
      .eq("id", leaveId)
      .eq("practitioner_id", practitionerId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /leaves error:", err);
    return NextResponse.json({ error: err?.message ?? "The selected leave entry could not be found." }, { status: 500 });
  }
}
