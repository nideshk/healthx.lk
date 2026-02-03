import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DateTime } from "luxon";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const { user, authorized, response } = await requireUser(req);
    if (!authorized) return response;

    if (!user?.practitioner_id) {
        return NextResponse.json({ error: "Not a practitioner" }, { status: 403 });
    }

    const {
        date,          // YYYY-MM-DD
        start_time,    // HH:mm
        end_time,      // HH:mm
        timezone = "Asia/Kolkata",
    } = await req.json();

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

    /* ---- Convert to UTC ---- */
    const starts_at = DateTime
        .fromISO(`${date}T${start_time}`, { zone: timezone })
        .toUTC()
        .toISO();

    const ends_at = DateTime
        .fromISO(`${date}T${end_time}`, { zone: timezone })
        .toUTC()
        .toISO();

    /* ---- Insert (NOT upsert) ---- */
    const { data, error } = await supabaseAdmin
        .from("practitioner_availability")
        .insert({
            practitioner_id: user.practitioner_id,
            starts_at,
            ends_at,
            timezone,
        })
        .select()
        .single();

    if (error) {
        console.error(error);

        // Duplicate availability (same practitioner, same start & end)
        if (error.code === "23505") {
            return NextResponse.json(
                { error: "This availability already exists" },
                { status: 409 } // Conflict
            );
        }

        return NextResponse.json(
            { error: "Failed to add availability" },
            { status: 500 }
        );
    }


    return NextResponse.json({
        success: true,
        availability: data,
    });
}

export async function GET(req: NextRequest) {
    const { user, authorized, response } = await requireUser(req);
    if (!authorized) return response;

    if (!user?.practitioner_id) {
        return NextResponse.json({ error: "Not a practitioner" }, { status: 403 });
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
