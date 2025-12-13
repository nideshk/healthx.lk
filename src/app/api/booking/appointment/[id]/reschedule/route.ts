// FILE: /app/api/booking/appointment/[id]/reschedule/route.ts

import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";
import { DateTime } from "luxon";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appointmentId } = await context.params;

    // Auth
    const { authorized, user } = await requireUser();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { starts_at, ends_at } = body;

    if (!starts_at || !ends_at) {
      return NextResponse.json(
        { error: "Missing required fields: starts_at, ends_at" },
        { status: 400 }
      );
    }

    // Fetch original appointment
    const { data: appointment, error: fetchErr } = await supabaseClient
      .from("appointments")
      .select("id, practitioner_id, patient_id, status, starts_at")
      .eq("id", appointmentId)
      .single();

    if (fetchErr || !appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (appointment.patient_id !== user?.patient_id) {
      return NextResponse.json(
        { error: "You cannot modify this appointment" },
        { status: 403 }
      );
    }

    // Prevent rescheduling cancelled/completed
    if (appointment.status !== "confirmed" && appointment.status !== "scheduled") {
      return NextResponse.json(
        { error: "Only active appointments can be rescheduled" },
        { status: 400 }
      );
    }

    // 🕒 6-HOUR RULE
    const now = DateTime.utc();
    const appointmentStartUTC = DateTime.fromISO(appointment.starts_at).toUTC();

    const diffInHours = appointmentStartUTC.diff(now, "hours").hours;

    if (diffInHours < 6) {
      return NextResponse.json(
        {
          error:
            "Rescheduling is allowed only if appointment is more than 6 hours away.",
        },
        { status: 400 }
      );
    }

    // Check if new slot is free
    const { data: conflict } = await supabaseClient
      .from("appointments")
      .select("id")
      .eq("practitioner_id", appointment.practitioner_id)
      .eq("starts_at", starts_at)
      .neq("id", appointmentId)
      .neq("status", "cancelled")
      .maybeSingle();

    if (conflict) {
      return NextResponse.json(
        { error: "This time slot is already booked" },
        { status: 409 }
      );
    }

    const { data: updated, error: updateErr } = await supabaseClient
      .from("appointments")
      .update({
        starts_at,
        ends_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json(
        { error: "Failed to update appointment", details: updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Appointment rescheduled successfully",
      appointment: updated,
    });
  } catch (err: any) {
    console.error("❌ Reschedule API Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
