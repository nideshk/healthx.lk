import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";

// Helper: Slot generator
function generateSlots(startTime: string, endTime: string, durationMins: number) {
  const slots: string[] = [];

  let [startH, startM] = startTime.split(":").map(Number);
  let [endH, endM] = endTime.split(":").map(Number);

  let start = startH * 60 + startM;
  let end = endH * 60 + endM;

  while (start + durationMins <= end) {
    const h = Math.floor(start / 60);
    const m = start % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    start += durationMins;
  }

  return slots;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ practitionerId: string }> }
) {
  try {
    // ⬅️ Required for typed routes
    const { practitionerId } = await context.params;

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    const { authorized, user } = await requireUser();

    if (!authorized) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { error: "date is required. Format: YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // 1) Fetch availability block
    const { data: availability, error: avErr } = await supabaseClient
      .from("practitioner_availability")
      .select("starts_at, ends_at, days_unavailable")
      .eq("practitioner_id", practitionerId)
      .single();

    if (avErr || !availability) {
      return NextResponse.json(
        { error: "Practitioner availability not found" },
        { status: 404 }
      );
    }

    const dayName = new Date(date).toLocaleString("en-US", { weekday: "long" });

    if (availability.days_unavailable?.includes(dayName)) {
      return NextResponse.json({
        practitioner_id: practitionerId,
        date,
        available: false,
        reason: "Practitioner unavailable on this day",
      });
    }

    // Extract HH:mm times
    const start_time = availability.starts_at.split("T")[1].substring(0, 5);
    const end_time = availability.ends_at.split("T")[1].substring(0, 5);

    // 2) Fetch appointment types
    const { data: appointmentTypes } = await supabaseClient
      .from("appointment_type")
      .select("id, name, duration_mins");

    // 3) Fetch booked appointments for the date
    const { data: booked } = await supabaseClient
      .from("appointments")
      .select("starts_at")
      .eq("practitioner_id", practitionerId)
      .gte("starts_at", `${date}T00:00:00`)
      .lte("starts_at", `${date}T23:59:59`)
      .neq("status", "cancelled");

    const bookedTimes =
      booked?.map((a) => a.starts_at.split("T")[1].substring(0, 5)) || [];

    // 4) Generate slots per appointment type
    const slots_by_type: Record<string, string[]> = {};

    appointmentTypes?.forEach((type) => {
      const generated = generateSlots(start_time, end_time, type.duration_mins);

      const filtered = generated.filter((t) => !bookedTimes.includes(t));

      slots_by_type[type.duration_mins] = filtered;
    });

    console.log("User requesting availability:", user);

    return NextResponse.json({
      practitioner_id: practitionerId,
      date,
      start_time,
      end_time,
      slots_by_type,
      requestedby: {
        user_email: user.email,
        user_id: user.user_metadata?.sub,
      },
    });
  } catch (err: any) {
    console.error("❌ Unexpected error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
