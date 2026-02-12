import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { DateTime } from "luxon";

// ------------------------
// TIME HELPERS
// ------------------------
const BLOCKING_STATUSES = [
  "pending",
  "scheduled",
  "confirmed",
  "payment_initiated",
  "awaiting_payment",
];

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function isOverlapping(
  slotStart: string,
  duration: number,
  booked: Array<{ start: string; end: string }>
) {
  const start = toMinutes(slotStart);
  const end = start + duration;

  return booked.some((b) => {
    const bStart = toMinutes(b.start);
    const bEnd = toMinutes(b.end);
    return start < bEnd && end > bStart;
  });
}

function generateSlots(startTime: string, endTime: string, duration: number) {
  const slots: string[] = [];
  let start = toMinutes(startTime);
  const end = toMinutes(endTime);

  while (start + duration <= end) {
    const h = Math.floor(start / 60)
      .toString()
      .padStart(2, "0");
    const m = (start % 60).toString().padStart(2, "0");

    slots.push(`${h}:${m}`);
    start += duration;
  }

  return slots;
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
      return NextResponse.json(
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
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    const offeredTypes = practitioner.available_services || [];
    if (offeredTypes.length === 0) {
      return NextResponse.json({
        practitioner_id: practitionerId,
        date,
        available: false,
        reason: "No services configured",
      });
    }

    /* ---------------------------
       STEP 2: Timezone + Guards
    --------------------------- */
    const timezone = "Asia/Colombo";

    const nowInTZ = DateTime.now().setZone(timezone);
    const todayInTZ = nowInTZ.toISODate();

    const requestedDate = DateTime.fromISO(date, { zone: timezone });
    if (requestedDate < nowInTZ.startOf("day")) {
      return NextResponse.json({
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
    const { data: availabilityWindows } = await supabaseClient
      .from("practitioner_availability")
      .select("starts_at, ends_at, timezone")
      .eq("practitioner_id", practitionerId)
      .gte("starts_at", dayStartUTC)
      .lte("starts_at", dayEndUTC);

    if (!availabilityWindows || availabilityWindows.length === 0) {
      return NextResponse.json({
        practitioner_id: practitionerId,
        date,
        available: false,
        reason: "No availability published",
      });
    }
    /* ---------------------------
       STEP 4: Appointment Types
    --------------------------- */
    const { data: appointmentTypes } = await supabaseClient
      .from("appointment_type")
      .select("id, name, duration_mins")
      .eq("is_active", true)
      .in("id", offeredTypes);

    if (!appointmentTypes) {
      return NextResponse.json(
        { error: "Failed to load appointment types" },
        { status: 500 }
      );
    }

    /* ---------------------------
       STEP 5: Bookings
    --------------------------- */
    const nowUTC = DateTime.utc().toISO();

    const { data: booked } = await supabaseClient
      .from("appointments")
      .select("starts_at, ends_at")
      .eq("practitioner_id", practitionerId)
      .gte("starts_at", dayStartUTC)
      .lte("starts_at", dayEndUTC)
      .in("status", ["pending", "scheduled", "confirmed"])
      .or(`expires_at.is.null,expires_at.gt.${nowUTC}`)
      .neq("payment_status", "failed");

    const bookedIntervals =
      booked?.map((appt) => {
        const start = DateTime.fromISO(appt.starts_at).setZone(timezone);
        const end = DateTime.fromISO(appt.ends_at).setZone(timezone);
        return {
          start: start.toFormat("HH:mm"),
          end: end.toFormat("HH:mm"),
        };
      }) || [];

    /* ---------------------------
       STEP 6: Leaves
    --------------------------- */
    const { data: leaves } = await supabaseClient
      .from("practitioner_leaves")
      .select("applied_windows, leave_type")
      .eq("practitioner_id", practitionerId)
      .lte("start_date", date)
      .gte("end_date", date);


    const leaveIntervals: Array<{ start: string; end: string }> = [];

    for (const lv of leaves || []) {
      // explicit windows
      const forDate = lv.applied_windows?.find((w: any) => w.date === date);
      if (forDate?.windows) {
        for (const win of forDate.windows) {
          leaveIntervals.push({
            start: DateTime.fromISO(win.from, { zone: "utc" })
              .setZone(timezone)
              .toFormat("HH:mm"),
            end: DateTime.fromISO(win.to, { zone: "utc" })
              .setZone(timezone)
              .toFormat("HH:mm"),
          });
        }
        continue;
      }

      // derive from leave_type
      for (const window of availabilityWindows) {
        const winTZ = window.timezone || timezone;

        const start = DateTime.fromISO(window.starts_at, {
          zone: "utc",
        }).setZone(winTZ);

        const end = DateTime.fromISO(window.ends_at, {
          zone: "utc",
        }).setZone(winTZ);

        const totalMinutes = end.diff(start, "minutes").minutes;
        const midpoint = start.plus({ minutes: totalMinutes / 2 });

        if (lv.leave_type === "full_day") {
          leaveIntervals.push({
            start: start.toFormat("HH:mm"),
            end: end.toFormat("HH:mm"),
          });
        }

        if (lv.leave_type === "first_half") {
          leaveIntervals.push({
            start: start.toFormat("HH:mm"),
            end: midpoint.toFormat("HH:mm"),
          });
        }

        if (lv.leave_type === "second_half") {
          leaveIntervals.push({
            start: midpoint.toFormat("HH:mm"),
            end: end.toFormat("HH:mm"),
          });
        }
      }
    }

    const blockedIntervals = [...bookedIntervals, ...leaveIntervals];

    /* ---------------------------
       STEP 7: Slot Generation
    --------------------------- */
    const MIN_BUFFER_MINUTES = 5;
    const cutoffMinutes =
      nowInTZ.hour * 60 + nowInTZ.minute + MIN_BUFFER_MINUTES;

    const slots_by_type: Record<string, string[]> = {};

    for (const type of appointmentTypes) {
      const allSlots: string[] = [];

      for (const window of availabilityWindows) {
        const winTZ = window.timezone || timezone;

        const start_time = DateTime.fromISO(window.starts_at, {
          zone: "utc",
        })
          .setZone(winTZ)
          .toFormat("HH:mm");

        const end_time = DateTime.fromISO(window.ends_at, {
          zone: "utc",
        })
          .setZone(winTZ)
          .toFormat("HH:mm");

        const generated = generateSlots(
          start_time,
          end_time,
          type.duration_mins
        );

        for (const slot of generated) {
          if (isOverlapping(slot, type.duration_mins, blockedIntervals))
            continue;
          if (date === todayInTZ && toMinutes(slot) < cutoffMinutes) continue;
          allSlots.push(slot);
        }
      }

      slots_by_type[type.name] = allSlots;
    }

    /* ---------------------------
       RESPONSE
    --------------------------- */
    return NextResponse.json({
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
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

