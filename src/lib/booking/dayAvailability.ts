import { DateTime } from "luxon";

export const BOOKING_TIMEZONE = "Asia/Colombo";
export const MIN_LEAD_MINUTES = 5;

export type AvailabilityWindow = {
  starts_at: string;
  ends_at: string;
  timezone?: string | null;
};

export type AppointmentTypeRow = {
  id: string;
  name: string;
  duration_mins: number;
};

export type BookedRow = {
  starts_at: string;
  ends_at: string;
};

export type LeaveRow = {
  applied_windows?: Array<{
    date?: string;
    windows?: Array<{ from: string; to: string }>;
  }> | null;
  leave_type?: string | null;
};

type Interval = { start: string; end: string };

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function isOverlapping(
  slotStart: string,
  duration: number,
  booked: Interval[]
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

/**
 * Same slot rules as GET /api/booking/[practitionerId]/availability?date=.
 * A date is bookable when this returns at least one time for any offered type.
 */
export function computeDayAvailability(input: {
  date: string;
  timezone?: string;
  nowInTZ: DateTime;
  availabilityWindows: AvailabilityWindow[];
  appointmentTypes: AppointmentTypeRow[];
  booked: BookedRow[];
  leaves: LeaveRow[];
}) {
  const timezone = input.timezone || BOOKING_TIMEZONE;
  const {
    date,
    nowInTZ,
    availabilityWindows,
    appointmentTypes,
    booked,
    leaves,
  } = input;

  const todayInTZ = nowInTZ.toISODate();

  const bookedIntervals: Interval[] =
    booked.map((appt) => {
      const start = DateTime.fromISO(appt.starts_at).setZone(timezone);
      const end = DateTime.fromISO(appt.ends_at).setZone(timezone);
      return {
        start: start.toFormat("HH:mm"),
        end: end.toFormat("HH:mm"),
      };
    }) || [];

  const leaveIntervals: Interval[] = [];

  for (const lv of leaves || []) {
    const forDate = lv.applied_windows?.find((w) => w.date === date);
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

  const cutoffMinutes =
    nowInTZ.hour * 60 + nowInTZ.minute + MIN_LEAD_MINUTES;

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

  return { slots_by_type, bookedIntervals, leaveIntervals };
}

export function colomboDateFromUtc(iso: string | null | undefined) {
  if (!iso) return null;
  const parsed = DateTime.fromISO(iso, { zone: "utc" }).setZone(
    BOOKING_TIMEZONE
  );
  if (!parsed.isValid) return null;
  return parsed.toISODate();
}
