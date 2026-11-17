/**
 * Patient and doctor join links must hit the private meeting page with the
 * appointment's room_key. Authorization looks the visit up by that column.
 * telehealth_url is a different field and is not a room id.
 */

const CLOSED_STATUSES = new Set([
  "cancelled",
  "canceled",
  "completed",
  "payment_failed",
  "payment_cancelled",
  "payment_canceled",
]);

export type JoinableAppointment = {
  id?: string;
  starts_at: string;
  ends_at?: string | null;
  status?: string | null;
  payment_status?: string | null;
  room_key?: string | null;
  telehealth_url?: string | null;
  practitioner?: { full_name?: string | null } | null;
  appointment_type?: { name?: string | null } | null;
  [key: string]: unknown;
};

export function meetingJoinPath(
  roomKey: string | null | undefined,
): string | null {
  if (roomKey == null || roomKey === "") return null;
  return `/appointment/meeting?room=${roomKey}`;
}

export function meetingJoinUrl(
  roomKey: string | null | undefined,
  baseUrl = "https://www.clinecxa.lk",
): string | null {
  const path = meetingJoinPath(roomKey);
  if (!path) return null;
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

/**
 * Use an absolute URL only when it already targets this appointment's room.
 * Otherwise build the canonical /appointment/meeting link from room_key.
 */
export function resolveJoinHref(input: {
  roomKey?: string | null;
  meetingUrl?: string | null;
  baseUrl?: string;
}): string {
  const canonical = meetingJoinUrl(input.roomKey, input.baseUrl);
  const provided = input.meetingUrl?.trim() ?? "";
  if (canonical && provided && input.roomKey && hrefTargetsRoom(provided, input.roomKey)) {
    return provided;
  }
  return canonical ?? provided;
}

function hrefTargetsRoom(href: string, roomKey: string): boolean {
  try {
    const url = new URL(href, "https://www.clinecxa.lk");
    const path = url.pathname.replace(/\/+$/, "");
    return path.endsWith("/appointment/meeting") && url.searchParams.get("room") === roomKey;
  } catch {
    return false;
  }
}

/**
 * The soonest visit that is still ahead or in progress.
 * Cancelled, completed, and failed-payment visits are skipped.
 */
export function selectNextAppointment<T extends JoinableAppointment>(
  appointments: readonly T[] | null | undefined,
  now: Date = new Date(),
): T | null {
  if (!appointments?.length) return null;
  const nowMs = now.getTime();

  const candidates = appointments.filter((appt) => {
    const status = (appt.status ?? "").trim().toLowerCase();
    if (CLOSED_STATUSES.has(status)) return false;
    // Unpaid holds live in the payment bucket, not the next visit.
    if ((appt.payment_status ?? "").toString().trim().toLowerCase() === "pending") {
      return false;
    }

    const startMs = new Date(appt.starts_at).getTime();
    if (Number.isNaN(startMs)) return false;

    const endMs = appt.ends_at ? new Date(appt.ends_at).getTime() : Number.NaN;
    if (!Number.isNaN(endMs)) return endMs >= nowMs;
    return startMs >= nowMs;
  });

  candidates.sort((a, b) => {
    const diff = new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    if (diff !== 0) return diff;
    return String(a.id ?? "").localeCompare(String(b.id ?? ""));
  });

  return candidates[0] ?? null;
}

export function resolveNextAppointmentJoin<T extends JoinableAppointment>(
  input: { appt?: T | null; appointments?: readonly T[] | null },
  now: Date = new Date(),
): { appointment: T; joinPath: string | null } | null {
  const pool = input.appointments ?? (input.appt ? [input.appt] : []);
  const appointment = selectNextAppointment(pool, now);
  if (!appointment) return null;
  return {
    appointment,
    joinPath: meetingJoinPath(appointment.room_key),
  };
}
