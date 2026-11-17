import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  BOOKING_TIMEZONE,
  computeDayAvailability,
  colomboDateFromUtc,
  type AppointmentTypeRow,
  type AvailabilityWindow,
  type BookedRow,
  type LeaveRow,
} from "@/lib/booking/dayAvailability";

export const dynamic = "force-dynamic";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Month calendar for the public booking picker.
 *
 * Fixed reads (not one query per day, and no HTTP call to the per-date route):
 * practitioner services, active appointment types, the month's windows,
 * overlapping leaves, and overlapping bookings. Slot rules then run in memory
 * through the same helper as GET /availability?date=.
 *
 * Approximation: a listed date can still have no selectable time. The response
 * is cached for up to 60s, a slot can be taken between the two requests, and a
 * date is listed when ANY offered type still has a time. The per-date route
 * remains the source of truth for the times of the type the patient picked.
 */
function datesJson(body: unknown, status = 200) {
  const headers = new Headers();
  headers.set(
    "Cache-Control",
    status === 200
      ? "public, s-maxage=60, stale-while-revalidate=120"
      : "private, no-store"
  );
  return NextResponse.json(body, { status, headers });
}

export async function GET(
  req: Request,
  context: { params: Promise<{ practitionerId: string }> }
) {
  try {
    const { practitionerId } = await context.params;
    const month = new URL(req.url).searchParams.get("month");

    if (!month || !MONTH_PATTERN.test(month)) {
      return datesJson(
        { error: "Missing or invalid month (YYYY-MM)" },
        400
      );
    }

    const monthStart = DateTime.fromISO(`${month}-01`, {
      zone: BOOKING_TIMEZONE,
    });
    if (!monthStart.isValid) {
      return datesJson({ error: "Missing or invalid month (YYYY-MM)" }, 400);
    }

    const monthEnd = monthStart.endOf("month");
    const rangeStartUTC = monthStart.startOf("day").toUTC().toISO();
    const rangeEndUTC = monthEnd.endOf("day").toUTC().toISO();
    const monthStartDate = monthStart.toISODate();
    const monthEndDate = monthEnd.toISODate();

    const { data: practitioner, error: practitionerError } =
      await supabaseClient
        .from("practitioners")
        .select("id, available_services")
        .eq("id", practitionerId)
        .maybeSingle();

    if (practitionerError) {
      console.error("available-dates practitioner read failed");
      return datesJson({ error: "Unable to load available dates" }, 500);
    }

    if (!practitioner) {
      return datesJson({ error: "Practitioner not found" }, 404);
    }

    const offeredTypes: string[] = practitioner.available_services || [];
    const empty = {
      practitioner_id: practitionerId,
      month,
      dates: [] as string[],
    };

    if (offeredTypes.length === 0 || !rangeStartUTC || !rangeEndUTC) {
      return datesJson(empty);
    }

    const nowInTZ = DateTime.now().setZone(BOOKING_TIMEZONE);
    const nowUTC = DateTime.utc().toISO();

    const [typesResult, windowsResult, leavesResult, bookedResult] =
      await Promise.all([
        supabaseClient
          .from("appointment_type")
          .select("id, name, duration_mins")
          .eq("is_active", true)
          .in("id", offeredTypes),
        supabaseClient
          .from("practitioner_availability")
          .select("starts_at, ends_at, timezone")
          .eq("practitioner_id", practitionerId)
          .gte("starts_at", rangeStartUTC)
          .lte("starts_at", rangeEndUTC),
        supabaseClient
          .from("practitioner_leaves")
          .select("applied_windows, leave_type, start_date, end_date")
          .eq("practitioner_id", practitionerId)
          .lte("start_date", monthEndDate)
          .gte("end_date", monthStartDate),
        supabaseClient
          .from("appointments")
          .select("starts_at, ends_at")
          .eq("practitioner_id", practitionerId)
          .gte("starts_at", rangeStartUTC)
          .lte("starts_at", rangeEndUTC)
          .in("status", ["pending", "scheduled", "confirmed"])
          .or(`expires_at.is.null,expires_at.gt.${nowUTC}`)
          .neq("payment_status", "failed"),
      ]);

    if (
      typesResult.error ||
      windowsResult.error ||
      leavesResult.error ||
      bookedResult.error
    ) {
      console.error("available-dates lookup failed");
      return datesJson({ error: "Unable to load available dates" }, 500);
    }

    const appointmentTypes = (typesResult.data || []) as AppointmentTypeRow[];
    const windows = (windowsResult.data || []) as AvailabilityWindow[];
    const leaves = (leavesResult.data || []) as Array<
      LeaveRow & { start_date?: string | null; end_date?: string | null }
    >;
    const booked = (bookedResult.data || []) as BookedRow[];

    if (appointmentTypes.length === 0 || windows.length === 0) {
      return datesJson(empty);
    }

    const windowsByDate = new Map<string, AvailabilityWindow[]>();
    for (const window of windows) {
      const date = colomboDateFromUtc(window.starts_at);
      if (!date || date < (monthStartDate || "") || date > (monthEndDate || "")) {
        continue;
      }
      const list = windowsByDate.get(date);
      if (list) list.push(window);
      else windowsByDate.set(date, [window]);
    }

    const today = nowInTZ.startOf("day");
    const dates: string[] = [];

    for (const date of [...windowsByDate.keys()].sort()) {
      const requested = DateTime.fromISO(date, { zone: BOOKING_TIMEZONE });
      if (!requested.isValid || requested < today) continue;

      const dayWindows = windowsByDate.get(date) || [];
      const dayLeaves = leaves.filter(
        (leave) =>
          !!leave.start_date &&
          !!leave.end_date &&
          leave.start_date <= date &&
          leave.end_date >= date
      );
      const dayBooked = booked.filter(
        (appt) => colomboDateFromUtc(appt.starts_at) === date
      );

      const { slots_by_type } = computeDayAvailability({
        date,
        timezone: BOOKING_TIMEZONE,
        nowInTZ,
        availabilityWindows: dayWindows,
        appointmentTypes,
        booked: dayBooked,
        leaves: dayLeaves,
      });

      const hasSlot = Object.values(slots_by_type).some(
        (slots) => slots.length > 0
      );
      if (hasSlot) dates.push(date);
    }

    return datesJson({
      practitioner_id: practitionerId,
      month,
      dates,
    });
  } catch {
    console.error("available-dates failed");
    return datesJson({ error: "Unable to load available dates" }, 500);
  }
}
