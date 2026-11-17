import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { DateTime } from "luxon";
import {
  BOOKING_TIMEZONE,
  computeDayAvailability,
} from "@/lib/booking/dayAvailability";

/** Slot results must not be cached. A booked time has to disappear immediately. */
function availabilityJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store");
  const response = NextResponse.json(body, { ...init, headers });
  return response;
}

/* ----------------------------------
   API
----------------------------------- */

export async function GET(
  req: Request,
  context: { params: Promise<{ practitionerId: string }> }
) {
  try {
    const { practitionerId } = await context.params;
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date"); // YYYY-MM-DD

    if (!date) {
      return availabilityJson(
        { error: "Missing required: date (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    /* ---------------------------
       STEP 1: Practitioner Services
    --------------------------- */
    const { data: practitioner } = await supabaseClient
      .from("practitioners")
      .select("available_services")
      .eq("id", practitionerId)
      .single();

    if (!practitioner) {
      return availabilityJson(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    const offeredTypes = practitioner.available_services || [];
    if (offeredTypes.length === 0) {
      return availabilityJson({
        practitioner_id: practitionerId,
        date,
        available: false,
        reason: "No services configured",
      });
    }

    /* ---------------------------
       STEP 2: Timezone + Guards
    --------------------------- */
    const timezone = BOOKING_TIMEZONE;

    const nowInTZ = DateTime.now().setZone(timezone);

    const requestedDate = DateTime.fromISO(date, { zone: timezone });
    if (requestedDate < nowInTZ.startOf("day")) {
      return availabilityJson({
        practitioner_id: practitionerId,
        date,
        available: false,
        reason: "Date is in the past",
      });
    }

    const dayStartUTC = requestedDate.startOf("day").toUTC().toISO();
    const dayEndUTC = requestedDate.endOf("day").toUTC().toISO();

    /* ---------------------------
       STEP 3: Availability Windows
    --------------------------- */
    const nowUTC = DateTime.utc().toISO();

    // One round trip for the day, instead of a query per table.
    const [windowsResult, typesResult, bookedResult, leavesResult] =
      await Promise.all([
        supabaseClient
          .from("practitioner_availability")
          .select("starts_at, ends_at, timezone")
          .eq("practitioner_id", practitionerId)
          .gte("starts_at", dayStartUTC)
          .lte("starts_at", dayEndUTC),
        supabaseClient
          .from("appointment_type")
          .select("id, name, duration_mins")
          .eq("is_active", true)
          .in("id", offeredTypes),
        supabaseClient
          .from("appointments")
          .select("starts_at, ends_at")
          .eq("practitioner_id", practitionerId)
          .gte("starts_at", dayStartUTC)
          .lte("starts_at", dayEndUTC)
          .in("status", ["pending", "scheduled", "confirmed"])
          .or(`expires_at.is.null,expires_at.gt.${nowUTC}`)
          .neq("payment_status", "failed"),
        supabaseClient
          .from("practitioner_leaves")
          .select("applied_windows, leave_type")
          .eq("practitioner_id", practitionerId)
          .lte("start_date", date)
          .gte("end_date", date),
      ]);

    if (
      windowsResult.error ||
      typesResult.error ||
      bookedResult.error ||
      leavesResult.error
    ) {
      console.error("Availability lookup failed");
      return availabilityJson(
        { error: "Unable to load availability" },
        { status: 500 }
      );
    }

    const availabilityWindows = windowsResult.data;
    const appointmentTypes = typesResult.data;
    const booked = bookedResult.data;
    const leaves = leavesResult.data;

    if (!availabilityWindows || availabilityWindows.length === 0) {
      return availabilityJson({
        practitioner_id: practitionerId,
        date,
        available: false,
        reason: "No availability published",
      });
    }

    if (!appointmentTypes) {
      return availabilityJson(
        { error: "Failed to load appointment types" },
        { status: 500 }
      );
    }

    const { slots_by_type, bookedIntervals, leaveIntervals } =
      computeDayAvailability({
        date,
        timezone,
        nowInTZ,
        availabilityWindows,
        appointmentTypes,
        booked: booked || [],
        leaves: leaves || [],
      });

    /* ---------------------------
       RESPONSE
    --------------------------- */
    return availabilityJson({
      practitioner_id: practitionerId,
      date,
      timezone,
      availability_windows: availabilityWindows.length,
      offered_types: appointmentTypes,
      booked_intervals: bookedIntervals,
      leave_intervals: leaveIntervals,
      slots_by_type,
    });
  } catch (err: any) {
    console.error("❌ Availability API Error:", err);
    return availabilityJson(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

