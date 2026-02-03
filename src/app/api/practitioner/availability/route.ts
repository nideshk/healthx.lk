import { auditLog } from "@/lib/audit/auditLog";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DateTime } from "luxon";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const { user, authorized, response } = await requireUser(req);
    if (!authorized) return response;

    const body = await req.json();

    const {
        practitioner_id: bodyPractitionerId,
        date,
        start_time,
        end_time,
        timezone = "Asia/Kolkata",
    } = body;

    /* -------------------- ROLE CHECK -------------------- */

    let targetPractitionerId: string | null = null;

    if (user.role === "practitioner") {
        // Practitioner can only act for self
        if (!user.practitioner_id) {
            return NextResponse.json({ error: "Not a practitioner" }, { status: 403 });
        }
        targetPractitionerId = user.practitioner_id;
    }

    else if (["admin", "superadmin"].includes(user.role)) {
        // Admins MUST specify practitioner_id
        if (!bodyPractitionerId) {
            return NextResponse.json(
                { error: "practitioner_id is required for admin actions" },
                { status: 400 }
            );
        }
        targetPractitionerId = bodyPractitionerId;
    }

    else {
        return NextResponse.json(
            { error: "Unauthorized role" },
            { status: 403 }
        );
    }

    /* -------------------- VALIDATION -------------------- */

    if (!date || !start_time || !end_time) {
        return NextResponse.json(
            { error: "date, start_time, end_time required" },
            { status: 400 }
        );
    }

    if (start_time >= end_time) {
        return NextResponse.json(
            { error: "start_time must be before end_time" },
            { status: 400 }
        );
    }

    /* ---- 4-week guard ---- */
    const requestedDate = new Date(date);
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 28);

    if (requestedDate > maxDate) {
        return NextResponse.json(
            { error: "Availability can only be added 4 weeks in advance" },
            { status: 400 }
        );
    }

    /* -------------------- TIME CONVERSION -------------------- */

    const starts_at = DateTime
        .fromISO(`${date}T${start_time}`, { zone: timezone })
        .toUTC()
        .toISO();

    const ends_at = DateTime
        .fromISO(`${date}T${end_time}`, { zone: timezone })
        .toUTC()
        .toISO();

    /* -------------------- INSERT -------------------- */

    const { data, error } = await supabaseAdmin
        .from("practitioner_availability")
        .insert({
            practitioner_id: targetPractitionerId,
            starts_at,
            ends_at,
            timezone,
        })
        .select()
        .single();

    if (error) {
        console.error(error);

        if (error.code === "23505") {
            return NextResponse.json(
                { error: "This availability already exists" },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: "Failed to add availability" },
            { status: 500 }
        );
    }

    const cnx = getAuditContext(req, user);

    await auditLog({
        ...cnx,
        action: "CREATED",
        entityType: "PRACTITIONER_AVAILABILITY",
        purpose: "operations",
        source: "dashboard",
        metadata: { availability_id: data.id },
    })

    return NextResponse.json({
        success: true,
        availability: data,
    });
}


export async function GET(req: NextRequest) {
    const { user, authorized, response } = await requireUser(req);
    if (!authorized) return response;

    if (!user?.practitioner_id || !user.admin) {
        return NextResponse.json({ error: "Not a practitioner or admin" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
        .from("practitioner_availability")
        .select("id, starts_at, ends_at, timezone")
        .eq("practitioner_id", user.practitioner_id)
        .order("starts_at", { ascending: true });

    if (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Failed to fetch availability" },
            { status: 500 }
        );
    }

    return NextResponse.json({
        availability: data ?? [],
    });
}
