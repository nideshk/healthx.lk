import { DateTime } from "luxon";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    context: { params: Promise<{ practitionerId: string }> }
) {
    const { practitionerId } = await context.params;
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // YYYY-MM

    if (!month) {
        return NextResponse.json(
            { error: "month required (YYYY-MM)" },
            { status: 400 }
        );
    }

    const timezone = "Asia/Kolkata";

    const monthStart = DateTime.fromISO(`${month}-01`, { zone: timezone });
    const monthEnd = monthStart.endOf("month");

    const dates: string[] = [];

    let day = monthStart;
    while (day <= monthEnd) {
        const dateStr = day.toISODate();

        // reuse your existing daily logic
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/booking/${practitionerId}/availability?date=${dateStr}`
        );

        const data = await res.json();

        const hasSlots =
            data?.slots_by_type &&
            Object.values(data.slots_by_type).some(
                (arr: any) => arr.length > 0
            );

        if (hasSlots) {
            dates.push(dateStr || "");
        }

        day = day.plus({ days: 1 });
    }

    return NextResponse.json({
        available_dates: dates,
    });
}
