import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const { user } = await requireUser(req);


    try {
        const body = await req.json();
        const { practitioner_id, availability } = body;

        if (!practitioner_id) {
            return NextResponse.json(
                { error: "practitioner_id is required" },
                { status: 400 }
            );
        }

        if (user && user.practitioner_id != practitioner_id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const {
            start_time,
            end_time,
            days_unavailable = [],
            timezone = "Asia/Colombo",
        } = availability || {};

        if (!start_time || !end_time) {
            return NextResponse.json(
                { error: "start_time and end_time are required" },
                { status: 400 }
            );
        }

        // ⚠️ Validation
        if (start_time >= end_time) {
            return NextResponse.json(
                { error: "Start time must be before end time" },
                { status: 400 }
            );
        }


        // Anchor times to today (only time-of-day matters)
        const today = new Date().toISOString().split("T")[0];

        const startsAt = `${today}T${start_time}:00`;
        const endsAt = `${today}T${end_time}:00`;

        const { data, error } = await supabaseAdmin
            .from("practitioner_availability")
            .upsert(
                {
                    practitioner_id,
                    starts_at: startsAt,
                    ends_at: endsAt,
                    days_unavailable,
                    timezone,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "practitioner_id" }
            )
            .select()
            .single();

        if (error) {
            console.error(error);
            return NextResponse.json(
                { error: "Failed to update availability" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            availability: data,
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "Invalid request" },
            { status: 400 }
        );
    }
}


export async function GET(req: NextRequest) {
    const { user } = await requireUser(req);
    try {
        const practitionerId = user?.practitioner_id

        if (!practitionerId) {
            return NextResponse.json(
                { error: "practitioner_id is required" },
                { status: 400 }
            );
        }


        const { data, error } = await supabaseAdmin
            .from("practitioner_availability")
            .select("starts_at, ends_at, days_unavailable, timezone")
            .eq("practitioner_id", practitionerId)
            .single();

        if (error && error.code !== "PGRST116") {
            // PGRST116 = no rows found
            console.error(error);
            return NextResponse.json(
                { error: "Failed to fetch availability" },
                { status: 500 }
            );
        }

        // If no availability exists yet → return defaults
        if (!data) {
            return NextResponse.json({
                availability: {
                    start_time: "09:00",
                    end_time: "18:00",
                    days_unavailable: [],
                    timezone: "Asia/Kolkata",
                },
            });
        }

        // Convert timestamp → HH:mm
        const startTime = new Date(data.starts_at)
            .toISOString()
            .substring(11, 16);

        const endTime = new Date(data.ends_at)
            .toISOString()
            .substring(11, 16);

        return NextResponse.json({
            availability: {
                start_time: startTime,
                end_time: endTime,
                days_unavailable: data.days_unavailable,
                timezone: data.timezone,
            },
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "Invalid request" },
            { status: 400 }
        );
    }
}