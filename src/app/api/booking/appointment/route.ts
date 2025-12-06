import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { authorized, user, role } = await requireUser();

    if (!authorized) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let query = supabaseAdmin
      .from("appointments")
      .select(
        `
        id,
        starts_at,
        ends_at,
        status,
        notes,
        cancellation_reason,
        cancelled_at,
        telehealth_url,

        appointment_type:appointment_type_id (
          id, name, duration_mins
        ),

        practitioner:practitioner_id (
          id, full_name, profile_picture_url, specialization
        ),

        patient:patient_id (
          id, full_name, email, contact_number
        )
      `
      )
      .order("starts_at", { ascending: true });

    // role filters
    if (role === "patient") query.eq("patient_id", user?.patient_id);
    if (role === "practitioner") query.eq("practitioner_id", user?.practitioner_id);

    const { data: rawAppointments, error } = await query;
    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch appointments", details: error.message },
        { status: 500 }
      );
    }

    const now = new Date();

    // Normalize view
    const normalized = rawAppointments.map((appt: any) => {
      const practitioner = Array.isArray(appt.practitioner)
        ? appt.practitioner[0]
        : appt.practitioner;

      const patient = Array.isArray(appt.patient)
        ? appt.patient[0]
        : appt.patient;

      let base = {
        id: appt.id,
        starts_at: appt.starts_at,
        ends_at: appt.ends_at,
        status: appt.status,
        cancellation_reason: appt.cancellation_reason,
        appointment_type: appt.appointment_type,
        telehealth_url: appt.telehealth_url,
      };

      if (role === "patient") {
        return {
          ...base,
          practitioner: {
            id: practitioner?.id,
            full_name: practitioner?.full_name,
            specialization: practitioner?.specialization,
            profile_picture_url: practitioner?.profile_picture_url,
          },
        };
      }

      if (role === "practitioner") {
        return {
          ...base,
          patient: {
            id: patient?.id,
            full_name: patient?.full_name,
            email: patient?.email,
            contact_number: patient?.contact_number,
          },
        };
      }

      return appt;
    });

    /* -------------------------------------------
       Correct Categorization with Ongoing
    -------------------------------------------- */

    const ongoing: any[] = [];
    const upcoming: any[] = [];
    const past: any[] = [];
    const cancelled: any[] = [];

   for (const a of normalized) {
  const start = new Date(a.starts_at);

  const end = a.ends_at
    ? new Date(a.ends_at)
    : new Date(start.getTime() + (a.appointment_type?.duration_mins ?? 15) * 60000);

  console.log("----- APPOINTMENT DEBUG -----");
  console.log("ID:", a.id);
  console.log("Start:", start.toISOString());
  console.log("End:", end.toISOString());
  console.log("Now:", now.toISOString());
  console.log("Status:", a.status);

  // Cancelled
  if (a.status === "cancelled" || a.cancellation_reason) {
    console.log("⛔ → CANCELLED\n");
    cancelled.push(a);
    continue;
  }

  // Ongoing
  if (start <= now && now <= end) {
    console.log("🟢 → ONGOING\n");
    ongoing.push(a);
    continue;
  }

  // Upcoming
  if (start > now) {
    console.log("🔵 → UPCOMING\n");
    upcoming.push(a);
    continue;
  }

  // Past
  if (end < now) {
    console.log("⚪ → PAST\n");
    past.push(a);
    continue;
  }

  console.log("❓ → UNKNOWN CASE\n");
}

    return NextResponse.json({
      success: true,
      role,
      count: {
        ongoing: ongoing.length,
        upcoming: upcoming.length,
        past: past.length,
        cancelled: cancelled.length,
      },
      ongoing,
      upcoming,
      past,
      cancelled,
    });

  } catch (err: any) {
    console.error("❌ Error fetching appointments:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
