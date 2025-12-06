import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";

export const runtime = "nodejs";

function calculateAge(dob: string | Date | null | undefined): number | null {
  if (!dob) return null;
  const birth = typeof dob === "string" ? new Date(dob) : new Date(dob);
  if (isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export async function GET() {
  try {
    const { authorized, user, role } = await requireUser();

    if (!authorized) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Base fetch (all appointments related to user)
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

        appointment_type:appointment_type_id (
          id, name, duration_mins
        ),

        practitioner:practitioner_id (
          id, full_name, profile_picture_url, specialization
        ),

        patient:patient_id (
          id, full_name, email, contact_number, allergies, dob, blood_type, gender
        )
      `
      )
      .order("starts_at", { ascending: true });

    /* ------------------------------------------------------
       Role-based filtering
    --------------------------------------------------------*/
    if (role === "patient") {
      query = query.eq("patient_id", user?.patient_id);
    }

    if (role === "practitioner") {
      query = query.eq("practitioner_id", user?.practitioner_id);
    }

    const { data: rawAppointments, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch appointments", details: error.message },
        { status: 500 }
      );
    }

    /* ------------------------------------------------------
       Normalize role-based view
    --------------------------------------------------------*/
    const now = new Date();

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
            blood_type: patient?.blood_type,
            dob: patient?.dob,
            age: calculateAge(patient?.dob),
            allergies: patient?.allergies,
            gender: patient?.gender
          },
        };
      }

      return appt; // admin
    });

    /* ------------------------------------------------------
       Categorization
    --------------------------------------------------------*/

    const upcoming = normalized.filter(
      (a) =>
        new Date(a.starts_at) > now && a.status !== "cancelled"
    );

    const past = normalized.filter(
      (a) =>
        new Date(a.starts_at) < now && a.status !== "cancelled"
    );

    const cancelled = normalized.filter(
      (a) => a.status === "cancelled" || a.cancellation_reason
    );

    return NextResponse.json({
      success: true,
      role,
      count: {
        upcoming: upcoming.length,
        past: past.length,
        cancelled: cancelled.length,
      },
      upcoming,
      past,
      cancelled,
    });
  } catch (err: any) {
    console.error("❌ Error fetching appointments:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
