import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser} from "@/lib/authGuard";

export const runtime = "nodejs";

export async function GET() {
  try {
    // 1️⃣ Auth → includes supabase_user?_id + patient_id / practitioner_id
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

    /* ------------------------------------------------------
      2️⃣ Filter by role
    --------------------------------------------------------*/

    if (role === "patient") {
      if (!user?.patient_id) {
        return NextResponse.json({ error: "Patient record missing" }, { status: 400 });
      }
      query = query.eq("patient_id", user?.patient_id);
    }

    if (role === "practitioner") {
      if (!user?.practitioner_id) {
        return NextResponse.json({ error: "Practitioner record missing" }, { status: 400 });
      }
      query = query.eq("practitioner_id", user?.practitioner_id);
    }

    if (role !== "admin") {
      query = query.neq("status", "cancelled");
    }

    /* ------------------------------------------------------
      3️⃣ Execute query
    --------------------------------------------------------*/
    const { data: appointments, error: err } = await query;

    if (err) {
      return NextResponse.json(
        { error: "Failed to fetch appointments", details: err.message },
        { status: 500 }
      );
    }

    /* ------------------------------------------------------
      4️⃣ Shape data by role
    --------------------------------------------------------*/
    const formatted = appointments.map((appt: any) => {
      const practitioner = Array.isArray(appt.practitioner)
        ? appt.practitioner[0]
        : appt.practitioner;

      const patient = Array.isArray(appt.patient)
        ? appt.patient[0]
        : appt.patient;

      if (role === "patient") {
        return {
          id: appt.id,
          starts_at: appt.starts_at,
          ends_at: appt.ends_at,
          status: appt.status,
          appointment_type: appt.appointment_type,
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
          id: appt.id,
          starts_at: appt.starts_at,
          ends_at: appt.ends_at,
          status: appt.status,
          appointment_type: appt.appointment_type,
          patient: {
            id: patient?.id,
            full_name: patient?.full_name,
            email: patient?.email,
            contact_number: patient?.contact_number,
          },
        };
      }

      // Admin sees all details
      return appt;
    });

    return NextResponse.json({
      success: true,
      role,
      count: formatted.length,
      appointments: formatted,
    });
  } catch (err: any) {
    console.error("❌ Error fetching appointments:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
