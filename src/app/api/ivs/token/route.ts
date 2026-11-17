import {
    CreateParticipantTokenCommand,
    ParticipantTokenCapability,
} from "@aws-sdk/client-ivs-realtime";
import { createHash } from "crypto";
import jwt from "jsonwebtoken";
import { ivsClient } from "@/lib/ivsClient";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const EARLY_JOIN_MINUTES = 10;
const LATE_JOIN_MINUTES = 15;

type MediaClaims = {
    appointmentId?: string;
    role?: string;
    sub?: string;
};

type AppointmentRow = {
    id: string;
    patient_id: string | null;
    practitioner_id: string | null;
    status: string;
    starts_at: string;
    ends_at: string;
    additional_attendees: Array<{ email?: string }> | null;
};

function ivsUserId(value: string) {
    if (/^[0-9a-f-]{16,64}$/i.test(value)) return value.slice(0, 128);
    return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function withinJoinWindow(startsAt: string, endsAt: string) {
    const now = Date.now();
    const start = new Date(startsAt).getTime();
    const end = new Date(endsAt).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
    return (
        now >= start - EARLY_JOIN_MINUTES * 60_000 &&
        now <= end + LATE_JOIN_MINUTES * 60_000
    );
}

function readMediaClaims(req: Request): MediaClaims | null {
    const secret = process.env.TELEHEALTH_JWT_SECRET;
    if (!secret) return null;
    const header = req.headers.get("authorization") ?? "";
    if (!header.startsWith("Bearer ")) return null;
    try {
        const decoded = jwt.verify(header.slice("Bearer ".length), secret);
        if (!decoded || typeof decoded === "string") return null;
        return {
            appointmentId:
                typeof decoded.appointmentId === "string"
                    ? decoded.appointmentId
                    : undefined,
            role: typeof decoded.role === "string" ? decoded.role : undefined,
            sub: typeof decoded.sub === "string" ? decoded.sub : undefined,
        };
    } catch {
        return null;
    }
}

export async function POST(req: Request) {
    let body: { appointmentId?: string } = {};
    try {
        body = await req.json();
    } catch {
        body = {};
    }

    const appointmentId = body.appointmentId;
    if (!appointmentId || typeof appointmentId !== "string") {
        return Response.json(
            { error: "appointmentId is required" },
            { status: 400 }
        );
    }

    const { data: appointment, error } = await supabaseAdmin
        .from("appointments")
        .select(
            "id, patient_id, practitioner_id, status, starts_at, ends_at, additional_attendees"
        )
        .eq("id", appointmentId)
        .maybeSingle();

    if (error) {
        console.error("IVS appointment lookup failed");
        return Response.json({ error: "Unable to issue video token" }, { status: 500 });
    }

    const appt = appointment as AppointmentRow | null;
    if (!appt) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (["cancelled", "completed"].includes(appt.status)) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!withinJoinWindow(appt.starts_at, appt.ends_at)) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const attendees = Array.isArray(appt.additional_attendees)
        ? appt.additional_attendees
        : [];

    let role: "patient" | "practitioner" | "attendee" | "guest" | null = null;
    let userId = "";
    let displayName = "Participant";

    const media = readMediaClaims(req);
    if (
        media?.appointmentId === appointmentId &&
        media.sub &&
        (media.role === "guest" || media.role === "attendee")
    ) {
        const allowed = attendees.some(
            (attendee) =>
                typeof attendee?.email === "string" &&
                attendee.email.toLowerCase() === media.sub!.toLowerCase()
        );
        if (!allowed) {
            return Response.json({ error: "Forbidden" }, { status: 403 });
        }
        role = media.role;
        userId = media.sub;
        displayName = "Guest";
    } else {
        const auth = await requireUser(req);
        if (!auth.authorized || !auth.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = auth.user;
        const email = (
            user.user?.email ||
            user.profile?.email ||
            ""
        ).toLowerCase();

        if (user.patient_id && user.patient_id === appt.patient_id) {
            role = "patient";
            displayName =
                user.patient?.full_name ||
                user.profile?.display_name ||
                "Patient";
        } else if (
            user.practitioner_id &&
            user.practitioner_id === appt.practitioner_id
        ) {
            role = "practitioner";
            displayName =
                user.practitioner?.full_name ||
                user.profile?.display_name ||
                "Practitioner";
        } else if (
            email &&
            attendees.some(
                (attendee) =>
                    typeof attendee?.email === "string" &&
                    attendee.email.toLowerCase() === email
            )
        ) {
            role = "attendee";
            displayName = user.profile?.display_name || "Guest";
        }

        if (!role) {
            return Response.json({ error: "Forbidden" }, { status: 403 });
        }

        userId = user.auth_user_id;
    }

    if (!process.env.IVS_STAGE_ARN) {
        console.error("IVS_STAGE_ARN is not set");
        return Response.json({ error: "Unable to issue video token" }, { status: 500 });
    }

    const capabilities = [
        ParticipantTokenCapability.PUBLISH,
        ParticipantTokenCapability.SUBSCRIBE,
    ];

    const command = new CreateParticipantTokenCommand({
        stageArn: process.env.IVS_STAGE_ARN,
        capabilities,
        duration: 900,
        userId: ivsUserId(userId),
        attributes: {
            displayName,
            role: role || "participant",
        },
    });

    const res = await ivsClient.send(command);

    return Response.json({
        token: res.participantToken,
    });
}
