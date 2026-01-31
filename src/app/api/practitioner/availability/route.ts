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


        const toUtcDate = (date: string, time: string, timeZone: string) => {
            const [hour, minute] = time.split(":").map(Number);

            const dt = new Date(`${date}T00:00:00Z`);

            const parts = new Intl.DateTimeFormat("en-US", {
                timeZone,
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            }).formatToParts(dt);

            const offsetHours = hour - Number(parts.find(p => p.type === "hour")?.value || 0);
            const offsetMinutes = minute - Number(parts.find(p => p.type === "minute")?.value || 0);

            dt.setUTCHours(offsetHours, offsetMinutes, 0, 0);
            return dt;
        };

        const localDate = new Date().toLocaleDateString("en-CA", { timeZone: timezone });

        const startsAt = toUtcDate(localDate, start_time, timezone);
        const endsAt = toUtcDate(localDate, end_time, timezone);



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

        const formatTime = (date: string, timeZone: string) =>
            new Intl.DateTimeFormat("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                timeZone,
            }).format(new Date(date));

        const startTime = formatTime(data.starts_at, data.timezone);
        const endTime = formatTime(data.ends_at, data.timezone);

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