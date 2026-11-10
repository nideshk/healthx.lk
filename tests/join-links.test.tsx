import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  meetingJoinPath,
  meetingJoinUrl,
  resolveJoinHref,
  resolveNextAppointmentJoin,
  selectNextAppointment,
  type JoinableAppointment,
} from "../src/lib/meetings/joinLink";
import {
  generateAppointmentConfirmationEmail,
  generateAppointmentReminderEmail,
  generatePractitionerConfirmationEmail,
} from "../src/lib/emailTemplates";
import { NextAppointmentCard } from "../src/components/dashboard/patient/[locale]/NextAppointmentCard";
import { AppointmentCard } from "../src/components/dashboard/patient/[locale]/AppointmentCard";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) =>
    values?.time ? `${key}:${values.time}` : key,
  useLocale: () => "en",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children?: ReactNode;
  }) => createElement("a", { href }, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined }),
}));

const root = process.cwd();
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");

function at(minutes: number, from = Date.parse("2026-11-10T12:00:00.000Z")) {
  return new Date(from + minutes * 60_000).toISOString();
}

const NOW = new Date("2026-11-10T12:00:00.000Z");

function visit(
  partial: Partial<JoinableAppointment> & Pick<JoinableAppointment, "id" | "starts_at" | "room_key">,
): JoinableAppointment {
  return {
    status: "confirmed",
    ends_at: at(30, Date.parse(partial.starts_at)),
    telehealth_url: `https://legacy.example/not-a-room/${partial.id}`,
    ...partial,
  };
}

describe("selectNextAppointment", () => {
  const cancelledSooner = visit({
    id: "cancelled",
    starts_at: at(-30),
    ends_at: at(15),
    status: "cancelled",
    room_key: "room-cancelled",
    practitioner: { full_name: "Cancelled Doctor" },
  });
  const completed = visit({
    id: "completed",
    starts_at: at(-20),
    ends_at: at(10),
    status: "completed",
    room_key: "room-completed",
    practitioner: { full_name: "Completed Doctor" },
  });
  const ended = visit({
    id: "ended",
    starts_at: at(-90),
    ends_at: at(-10),
    status: "confirmed",
    room_key: "room-ended",
  });
  const live = visit({
    id: "live",
    starts_at: at(-5),
    ends_at: at(25),
    status: "confirmed",
    room_key: "room-live",
    practitioner: { full_name: "Live Doctor" },
  });
  const later = visit({
    id: "later",
    starts_at: at(120),
    ends_at: at(150),
    status: "confirmed",
    room_key: "room-later",
    practitioner: { full_name: "Later Doctor" },
  });
  const failed = visit({
    id: "failed",
    starts_at: at(-2),
    ends_at: at(20),
    status: "payment_failed",
    room_key: "room-failed",
  });

  const list = [later, cancelledSooner, completed, ended, failed, live];

  it("picks the soonest visit that is not cancelled, completed, or already over", () => {
    const next = selectNextAppointment(list, NOW);
    expect(next?.id).toBe("live");
    expect(next?.room_key).toBe("room-live");
    expect(next?.room_key).not.toBe(next?.telehealth_url);
  });

  it("uses that visit's room_key even when telehealth_url points somewhere else", () => {
    const resolved = resolveNextAppointmentJoin({ appointments: list }, NOW);
    expect(resolved?.joinPath).toBe("/appointment/meeting?room=room-live");
    expect(resolved?.joinPath).not.toContain("legacy.example");
    expect(resolved?.joinPath).not.toContain("room-later");
    expect(resolved?.joinPath).not.toContain("room-cancelled");
  });

  it("falls through to the following upcoming visit when nothing is in progress", () => {
    const next = selectNextAppointment([cancelledSooner, completed, ended, later], NOW);
    expect(next?.id).toBe("later");
    expect(resolveNextAppointmentJoin({ appt: next }, NOW)?.joinPath).toBe(
      "/appointment/meeting?room=room-later",
    );
  });

  it("skips an earlier unpaid hold in favour of the next confirmed visit", () => {
    const unpaid = visit({
      id: "unpaid",
      starts_at: at(15),
      ends_at: at(45),
      status: "pending",
      payment_status: "pending",
      room_key: "room-unpaid",
    });
    const next = selectNextAppointment([unpaid, later], NOW);
    expect(next?.id).toBe("later");
    expect(resolveNextAppointmentJoin({ appointments: [unpaid, later] }, NOW)?.joinPath).toBe(
      "/appointment/meeting?room=room-later",
    );
  });

  it("returns null when every visit is closed", () => {
    expect(selectNextAppointment([cancelledSooner, completed, ended], NOW)).toBeNull();
    expect(selectNextAppointment([], NOW)).toBeNull();
    expect(resolveNextAppointmentJoin({ appointments: [cancelledSooner] }, NOW)).toBeNull();
  });

  it("breaks start-time ties by id", () => {
    const a = visit({ id: "b-id", starts_at: at(60), room_key: "room-b" });
    const b = visit({ id: "a-id", starts_at: at(60), room_key: "room-a" });
    expect(selectNextAppointment([a, b], NOW)?.id).toBe("a-id");
  });
});

describe("meeting join url", () => {
  it("builds the private meeting path from the room key only", () => {
    expect(meetingJoinPath("room-42")).toBe("/appointment/meeting?room=room-42");
    expect(meetingJoinPath("")).toBeNull();
    expect(meetingJoinPath(null)).toBeNull();
    expect(meetingJoinUrl("room-42", "https://staging.example/")).toBe(
      "https://staging.example/appointment/meeting?room=room-42",
    );
  });

  it("keeps an absolute link only when it already targets that room", () => {
    expect(
      resolveJoinHref({
        roomKey: "room-42",
        meetingUrl: "https://preview.example/appointment/meeting?room=room-42",
      }),
    ).toBe("https://preview.example/appointment/meeting?room=room-42");

    expect(
      resolveJoinHref({
        roomKey: "room-42",
        meetingUrl: "https://legacy.example/telehealth/room-42",
      }),
    ).toBe("https://www.clinecxa.lk/appointment/meeting?room=room-42");
  });
});

describe("patient join cards", () => {
  it("renders the next card for the live visit and joins with its room key", () => {
    const nowMs = Date.now();
    const html = renderToStaticMarkup(
      createElement(NextAppointmentCard, {
        appointments: [
          {
            id: "cancelled",
            starts_at: new Date(nowMs - 10 * 60_000).toISOString(),
            ends_at: new Date(nowMs + 20 * 60_000).toISOString(),
            status: "cancelled",
            room_key: "room-cancelled",
            telehealth_url: "room-live",
            practitioner: { full_name: "Cancelled Doctor" },
          },
          {
            id: "live",
            starts_at: new Date(nowMs - 60_000).toISOString(),
            ends_at: new Date(nowMs + 20 * 60_000).toISOString(),
            status: "confirmed",
            room_key: "room-live",
            telehealth_url: "https://legacy.example/wrong-room",
            practitioner: { full_name: "Live Doctor" },
          },
          {
            id: "later",
            starts_at: new Date(nowMs + 3 * 60 * 60_000).toISOString(),
            ends_at: new Date(nowMs + 4 * 60 * 60_000).toISOString(),
            status: "confirmed",
            room_key: "room-later",
            telehealth_url: "room-live",
            practitioner: { full_name: "Later Doctor" },
          },
        ],
      }),
    );

    expect(html).toContain("Live Doctor");
    expect(html).not.toContain("Cancelled Doctor");
    expect(html).not.toContain("Later Doctor");
    expect(html).toContain('href="/appointment/meeting?room=room-live"');
    expect(html).not.toContain("legacy.example");
    expect(html).not.toContain("room-cancelled");
    expect(html).not.toContain("room-later");
  });

  it("shows the upcoming visit without a join button before it starts", () => {
    const nowMs = Date.now();
    const html = renderToStaticMarkup(
      createElement(NextAppointmentCard, {
        appointments: [
          {
            id: "done",
            starts_at: new Date(nowMs - 2 * 60 * 60_000).toISOString(),
            ends_at: new Date(nowMs - 60 * 60_000).toISOString(),
            status: "completed",
            room_key: "room-done",
            practitioner: { full_name: "Completed Doctor" },
          },
          {
            id: "next",
            starts_at: new Date(nowMs + 2 * 60 * 60_000).toISOString(),
            ends_at: new Date(nowMs + 3 * 60 * 60_000).toISOString(),
            status: "confirmed",
            room_key: "room-next",
            telehealth_url: "not-the-room",
            practitioner: { full_name: "Next Doctor" },
          },
        ],
      }),
    );

    expect(html).toContain("Next Doctor");
    expect(html).not.toContain("Completed Doctor");
    expect(html).not.toContain("href=");
    expect(html).not.toContain("not-the-room");
  });

  it("appointment cards join the ongoing visit by room_key", () => {
    const html = renderToStaticMarkup(
      createElement(AppointmentCard, {
        appt: {
          id: "appt-1",
          starts_at: new Date().toISOString(),
          room_key: "room-card",
          telehealth_url: "https://legacy.example/other",
          practitioner: { full_name: "Card Doctor" },
          appointment_type: { name: "Consult" },
        },
        isOngoing: true,
      }),
    );

    expect(html).toContain('href="/appointment/meeting?room=room-card"');
    expect(html).not.toContain("legacy.example");
  });
});

describe("notification emails", () => {
  const appointment = {
    id: "appt-1",
    startsAt: "2026-11-10T12:00:00.000Z",
    endsAt: "2026-11-10T12:30:00.000Z",
    practitionerName: "N. Perera",
    appointmentType: "Consult",
    roomKey: "room-email",
    meetingUrl: "https://legacy.example/telehealth/old",
  };

  it("doctor confirmation ignores a telehealth_url that is not this room", () => {
    const html = generatePractitionerConfirmationEmail({
      practitionerName: "N. Perera",
      patientName: "A. Silva",
      appointment,
    });
    expect(html).toContain("https://www.clinecxa.lk/appointment/meeting?room=room-email");
    expect(html).not.toContain("legacy.example");
  });

  it("doctor confirmation keeps a link that already targets the room key", () => {
    const html = generatePractitionerConfirmationEmail({
      practitionerName: "N. Perera",
      patientName: "A. Silva",
      appointment: {
        ...appointment,
        meetingUrl: "https://preview.example/appointment/meeting?room=room-email",
      },
    });
    expect(html).toContain("https://preview.example/appointment/meeting?room=room-email");
  });

  it("reminders keep the magic-link button and do not fall back to telehealth_url", () => {
    const magic = "https://auth.example/verify?token=parent";
    const withMagic = generateAppointmentReminderEmail({
      recipientName: "A. Silva",
      appointment,
      actionUrl: magic,
      actionText: "Join Meeting",
    });
    expect(withMagic).toContain(`href="${magic}"`);
    expect(withMagic).not.toContain("legacy.example");

    const withoutMagic = generateAppointmentReminderEmail({
      recipientName: "A. Silva",
      appointment,
    });
    expect(withoutMagic).toContain("/appointment/meeting?room=room-email");
    expect(withoutMagic).not.toContain("legacy.example");
  });

  it("confirmation emails keep the supplied sign-in link", () => {
    const magic = "https://auth.example/verify?token=parent";
    const html = generateAppointmentConfirmationEmail({
      recipientName: "A. Silva",
      appointment,
      actionUrl: magic,
      actionText: "Join Meeting",
    });
    expect(html).toContain(`href="${magic}"`);
    expect(html).not.toContain("legacy.example");
  });
});

describe("join link call sites", () => {
  it("patient next card, appointment card, and detail page use the room key path", () => {
    const nextCard = read("src/components/dashboard/patient/[locale]/NextAppointmentCard.tsx");
    const card = read("src/components/dashboard/patient/[locale]/AppointmentCard.tsx");
    const tab = read("src/components/dashboard/patient/[locale]/tabs/AppointmentTab.tsx");
    const detail = read("src/app/(private)/dashboard/(patient)/appointment/[id]/page.tsx");
    const detailApi = read("src/app/api/booking/appointment/[id]/route.ts");

    expect(nextCard).toContain("resolveNextAppointmentJoin");
    expect(nextCard).not.toContain("telehealth_url");
    expect(card).toContain("meetingJoinPath(appt.room_key)");
    expect(card).not.toContain("telehealth_url");
    expect(tab).toContain("<NextAppointmentCard appointments={allAppointments} />");
    expect(detail).toContain("meetingJoinPath(appointment.room_key)");
    expect(detail).not.toContain("/meeting?room=");
    expect(detailApi).toContain("room_key: appointment.room_key");
  });

  it("doctor and admin join links already target room_key", () => {
    const files = [
      "src/components/dashboard/practitioner/tabs/shared/AppointmentCalendar.tsx",
      "src/components/dashboard/practitioner/tabs/seachPatients/PatientDetailView.tsx",
      "src/components/dashboard/practitioner/tabs/shared/ManageAppointmentModal.tsx",
      "src/components/dashboard/admin/tabs/shared/ManageAppointmentModal.tsx",
      "src/components/dashboard/admin/tabs/searchPatient/PatientDetails.tsx",
    ];
    for (const file of files) {
      const text = read(file);
      expect(text).toContain("/appointment/meeting?room=");
      expect(text).toMatch(/room_key/);
      expect(text).not.toMatch(/meeting\?room=\$\{[^}]*telehealth_url/);
    }
    expect(read("src/components/dashboard/practitioner/tabs/HomeTab.tsx")).toContain(
      "room_key: item.room_key",
    );
  });

  it("notification emails build the meeting url from room_key and still sign in with a magic link", () => {
    const worker = read("src/workers/notificationWorker.ts");
    expect(worker).toContain("meetingJoinUrl(");
    expect(worker).toContain("appointment.room_key");
    expect(worker).not.toContain("meetingUrl: appointment.telehealth_url");
    expect(worker).toContain('type: \'magiclink\'');
    expect(worker).toContain("redirectTo: meetingUrl");
    expect(worker).toContain("/appointment/meeting?room=${appointmentData.roomKey}");
  });

  it("does not change authorize lookup or the guest invite token link", () => {
    const authorize = read("src/app/api/telehealth/authorize/route.ts");
    expect(authorize).toContain('.eq("room_key", roomKey)');
    expect(read("src/lib/additional_attendee/appointmentInvites.ts")).toContain(
      "/meeting?token=${token}",
    );
    expect(read("src/app/api/ivs/token/route.ts")).toContain("withinJoinWindow");
  });
});
