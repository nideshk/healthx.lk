import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";

// ------------------------
// TIME HELPERS
// ------------------------
function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function isOverlapping(slotStart: string, duration: number, bookedSlots: any[]) {
  const slotStartMin = toMinutes(slotStart);
  const slotEndMin = slotStartMin + duration;

  return bookedSlots.some((b) => {
    const bStart = toMinutes(b.start);
    const bEnd = toMinutes(b.end);
    return slotStartMin < bEnd && slotEndMin > bStart; // Overlap logic
  });
}

// Generate slots (for the full day window)
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
    start += durationMins;  // 🔥 FIXED — increment by slot duration
  }

  return slots;
}


export async function GET(
  req: Request,
  context: { params: Promise<{ practitionerId: string }> }
) {
  try {
    const { practitionerId } = await context.params;

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    // ---------------------------
    // AUTH CHECK 
    // ---------------------------
    const { authorized, user } = await requireUser();

    console.log("👤 Authenticated user:", user);

    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!date) {
      return NextResponse.json(
        { error: "Missing required: date (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // ---------------------------
    // STEP 1: Practitioner services
    // ---------------------------
    const { data: practitioner, error: practitionerErr } = await supabaseClient
      .from("practitioners")
      .select("available_services")
      .eq("id", practitionerId)
      .single();

    if (practitionerErr || !practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    const offeredTypes = practitioner.available_services || [];
    if (offeredTypes.length === 0) {
      return NextResponse.json({
        practitioner_id: practitionerId,
        date,
        available: false,
        reason: "Practitioner has no services configured",
      });
    }

    // ---------------------------
    // STEP 2: Fetch availability
    // ---------------------------
    const { data: availability, error: avErr } = await supabaseClient
      .from("practitioner_availability")
      .select("starts_at, ends_at, days_unavailable")
      .eq("practitioner_id", practitionerId)
      .single();

    if (avErr || !availability) {
      return NextResponse.json(
        { error: "Availability not configured" },
        { status: 404 }
      );
    }

    const dayName = new Date(date).toLocaleString("en-US", { weekday: "long" });

    if (availability.days_unavailable?.includes(dayName)) {
      return NextResponse.json({
        practitioner_id: practitionerId,
        date,
        available: false,
        reason: `Unavailable on ${dayName}`,
      });
    }

    const start_time = availability.starts_at.split("T")[1].substring(0, 5);
    const end_time = availability.ends_at.split("T")[1].substring(0, 5);

    // ---------------------------
    // STEP 3: Fetch appointment types offered
    // ---------------------------
    const { data: appointmentTypes, error: typeErr } = await supabaseClient
      .from("appointment_type")
      .select("id, name, duration_mins")
      .in("id", offeredTypes);

    if (typeErr) {
      return NextResponse.json(
        { error: "Failed to load appointment types" },
        { status: 500 }
      );
    }

    // ---------------------------
    // STEP 4: Fetch booked appointments (intervals)
    // ---------------------------
    const { data: booked } = await supabaseClient
      .from("appointments")
      .select("starts_at, ends_at")
      .eq("practitioner_id", practitionerId)
      .gte("starts_at", `${date}T00:00:00`)
      .lte("starts_at", `${date}T23:59:59`)
      .neq("status", "cancelled");

    const bookedIntervals =
      booked?.map((appt) => ({
        start: appt.starts_at.split("T")[1].substring(0, 5),
        end: appt.ends_at.split("T")[1].substring(0, 5),
      })) || [];

    // ---------------------------
    // STEP 5: Generate slots by type
    // ---------------------------
    const slots_by_type: Record<string, string[]> = {};

    for (const type of appointmentTypes) {
      const generated = generateSlots(
        start_time,
        end_time,
        type.duration_mins
      );

      const filtered = generated.filter(
        (slot) => !isOverlapping(slot, type.duration_mins, bookedIntervals)
      );

      slots_by_type[type.name] = filtered;
    }

    // ---------------------------
    // RESPOND
    // ---------------------------
    return NextResponse.json({
      practitioner_id: practitionerId,
      date,
      start_time,
      end_time,
      offered_types: appointmentTypes,
      booked_intervals: bookedIntervals,
      slots_by_type,
      requested_by: {
        patient_id: user?.patient_id,
        role: user?.role,
      },
    });
  } catch (err: any) {
    console.error("❌ Availability API Error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
