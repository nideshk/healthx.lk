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
          id,
          supabase_user_id,
          full_name,
          email,
          contact_number,
          allergies,
          dob,
          blood_type,
          gender,
          address
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
    const appointments = rawAppointments ?? [];

    // ------------------------------------
    // FETCH PATIENT PROFILES (2nd QUERY)
    // ------------------------------------
    const patientUserIds = [
      ...new Set(
        appointments
          .map((a: any) => {
            const patient = Array.isArray(a.patient)
              ? a.patient[0]
              : a.patient;
            return patient?.supabase_user_id;
          })
          .filter(Boolean)
      ),
    ];

    let profileMap: Record<string, any> = {};

    if (patientUserIds.length > 0) {
      const { data: profiles, error: profileErr } = await supabaseAdmin
        .from("profiles")
        .select("id, city, state, country")
        .in("id", patientUserIds);

      if (profileErr) {
        return NextResponse.json(
          { error: "Failed to fetch patient profiles" },
          { status: 500 }
        );
      }

      profileMap = Object.fromEntries(
        profiles.map((p: any) => [p.id, p])
      );
    }    

    const now = new Date();

    // Normalize view
  const normalized = appointments.map((appt: any) => {
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
        const profile = patient?.supabase_user_id
        ? profileMap[patient.supabase_user_id]
        : null;
                 
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
            gender: patient?.gender,
            address: patient?.address ?? null,
            city: profile?.city ?? null,
            state: profile?.state ?? null,
            country: profile?.country ?? null,
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

  if(a.status === "pending"){
    console.log("Skipping pending appointment\n");
    continue;
  }

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
