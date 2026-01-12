import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { DateTime } from "luxon";

// ------------------------
// TIME HELPERS
// ------------------------
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

// ------------------------
// MAIN HANDLER
// ------------------------
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

    // ---------------------------
    // STEP 1: Practitioner Services
    // ---------------------------
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

    // ---------------------------
    // STEP 2: Fetch Availability
    // ---------------------------
    const { data: availability } = await supabaseClient
      .from("practitioner_availability")
      .select("starts_at, ends_at, days_unavailable, timezone")
      .eq("practitioner_id", practitionerId)
      .single();

    if (!availability) {
      return NextResponse.json(
        { error: "Availability not configured" },
        { status: 404 }
      );
    }

    const timezone = availability.timezone || "UTC";

    // ---------------------------
    // STEP 2.5: TODAY / PAST GUARD (NEW)
    // ---------------------------
    const nowInTZ = DateTime.now().setZone(timezone);
    const todayInTZ = nowInTZ.toISODate();

    const requestedDate = DateTime.fromISO(date).setZone(timezone);
    if (requestedDate < nowInTZ.startOf("day")) {
      return NextResponse.json({
        practitioner_id: practitionerId,
        date,
        available: false,
        reason: "Date is in the past",
      });
    }

    // ---------------------------
    // STEP 3: Day availability check
    // ---------------------------
    const dayName = requestedDate.toFormat("EEEE");

    if (availability.days_unavailable?.includes(dayName)) {
      return NextResponse.json({
        practitioner_id: practitionerId,
        date,
        available: false,
        reason: `Unavailable on ${dayName}`,
      });
    }

    // ---------------------------
    // STEP 4: Convert availability UTC → local
    // ---------------------------
    const start_time = DateTime.fromISO(availability.starts_at, {
      zone: "utc",
    })
      .setZone(timezone)
      .toFormat("HH:mm");

    const end_time = DateTime.fromISO(availability.ends_at, {
      zone: "utc",
    })
      .setZone(timezone)
      .toFormat("HH:mm");

    // ---------------------------
    // STEP 5: Fetch Appointment Types
    // ---------------------------
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

    // ---------------------------
    // STEP 6: Fetch booked appointments
    // ---------------------------
    const { data: booked } = await supabaseClient
      .from("appointments")
      .select("starts_at, ends_at")
      .eq("practitioner_id", practitionerId)
      .gte("starts_at", `${date}T00:00:00`)
      .lte("starts_at", `${date}T23:59:59`)
      .neq("status", "cancelled");

    const bookedIntervals =
      booked?.map((appt) => {
        const start = DateTime.fromISO(appt.starts_at).setZone(timezone);
        const end = DateTime.fromISO(appt.ends_at).setZone(timezone);
        return {
          start: start.toFormat("HH:mm"),
          end: end.toFormat("HH:mm"),
        };
      }) || [];

    // ---------------------------
    // STEP 6b: Practitioner Leaves
    // ---------------------------
    const { data: leaves } = await supabaseClient
      .from("practitioner_leaves")
      .select("applied_windows")
      .eq("practitioner_id", practitionerId)
      .lte("start_date", date)
      .gte("end_date", date);

    const leaveIntervals: Array<{ start: string; end: string }> = [];

    if (Array.isArray(leaves)) {
      for (const lv of leaves) {
        const forDate = lv.applied_windows?.find(
          (w: any) => w.date === date
        );
        if (!forDate?.windows) continue;

        for (const win of forDate.windows) {
          const localStart = DateTime.fromISO(win.from, {
            zone: "utc",
          })
            .setZone(timezone)
            .toFormat("HH:mm");
          const localEnd = DateTime.fromISO(win.to, {
            zone: "utc",
          })
            .setZone(timezone)
            .toFormat("HH:mm");

          leaveIntervals.push({ start: localStart, end: localEnd });
        }
      }
    }

    // ---------------------------
    // STEP 7: Merge blocked intervals
    // ---------------------------
    const blockedIntervals = [...bookedIntervals, ...leaveIntervals];

    // ---------------------------
    // STEP 8: Build slots (PAST FILTER FIX)
    // ---------------------------
    const MIN_BUFFER_MINUTES = 5;
    const cutoffMinutes =
      nowInTZ.hour * 60 + nowInTZ.minute + MIN_BUFFER_MINUTES;

    const slots_by_type: Record<string, string[]> = {};

    for (const type of appointmentTypes) {
      const generated = generateSlots(
        start_time,
        end_time,
        type.duration_mins
      );

      const filtered = generated.filter((slot) => {
        // block overlaps
        if (isOverlapping(slot, type.duration_mins, blockedIntervals)) {
          return false;
        }

        // 👇 remove past slots for TODAY
        if (date === todayInTZ) {
          if (toMinutes(slot) < cutoffMinutes) {
            return false;
          }
        }

        return true;
      });

      slots_by_type[type.name] = filtered;
    }

    // ---------------------------
    // RESPONSE
    // ---------------------------
    return NextResponse.json({
      practitioner_id: practitionerId,
      date,
      timezone,
      start_time,
      end_time,
      offered_types: appointmentTypes,
      booked_intervals: bookedIntervals,
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
