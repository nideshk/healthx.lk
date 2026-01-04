import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { auditLog } from "@/lib/audit/auditLog";
import { getAuditContext } from "@/lib/audit/getAuditContext";

export const runtime = "nodejs";

/* -------------------------------------
   Utility
------------------------------------- */
function calculateAge(dob: string | Date | null | undefined): number | null {
  if (!dob) return null;
  const birth = typeof dob === "string" ? new Date(dob) : dob;
  if (isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/* -------------------------------------
   GET Appointments
------------------------------------- */
export async function GET(req: NextRequest) {
  try {
    const { authorized, user, role } = await requireUser();
    if (!authorized) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const cnx = getAuditContext(req, user);

    /* -------------------------------------
       Base Query
    ------------------------------------- */
    let query = supabaseAdmin
      .from("appointments")
      .select(
        `
        id,
        starts_at,
        ends_at,
        status,
        payment_status,
        expires_at,
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

    // Role-based filtering
    if (role === "patient") {
      query = query.eq("patient_id", user?.patient_id);
    }

    if (role === "practitioner") {
      query = query.eq("practitioner_id", user?.practitioner_id).not("patient_id", "is", null);
    }

    const { data: rawAppointments, error } = await query;
    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch appointments", details: error.message },
        { status: 500 }
      );
    }

    const appointments = rawAppointments ?? [];

    /* -------------------------------------
       Fetch patient profiles (2nd query)
    ------------------------------------- */
    const patientUserIds = [
      ...new Set(
        appointments
          .map((a: any) => {
            const p = Array.isArray(a.patient) ? a.patient[0] : a.patient;
            return p?.supabase_user_id;
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

    /* -------------------------------------
       Normalize View
    ------------------------------------- */
    const normalized = appointments.map((appt: any) => {
      const practitioner = Array.isArray(appt.practitioner)
        ? appt.practitioner[0]
        : appt.practitioner;

      const patient = Array.isArray(appt.patient)
        ? appt.patient[0]
        : appt.patient;

      const base = {
        id: appt.id,
        starts_at: appt.starts_at,
        ends_at: appt.ends_at,
        status: appt.status,
        payment_status: appt.payment_status,
        expires_at: appt.expires_at,
        notes: appt.notes,
        cancellation_reason: appt.cancellation_reason,
        telehealth_url: appt.telehealth_url,
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

    /* -------------------------------------
       Categorization (FIXED)
    ------------------------------------- */
    const now = new Date();

    const pending_payment: any[] = [];
    const ongoing: any[] = [];
    const upcoming: any[] = [];
    const past: any[] = [];
    const cancelled: any[] = [];

    for (const a of normalized) {
      const start = new Date(a.starts_at);

      const end = a.ends_at
        ? new Date(a.ends_at)
        : new Date(
            start.getTime() +
              (a.appointment_type?.duration_mins ?? 15) * 60000
          );

      // 1️⃣ Cancelled (highest priority)
      if (a.status === "cancelled" || a.cancellation_reason) {
        cancelled.push(a);
        continue;
      }

  // Cancelled
  if (a.status === "cancelled" || a.cancellation_reason) {
    console.log("⛔ → CANCELLED\n");
    cancelled.push(a);
    continue;
  }
      // 2️⃣ Pending payment (admin or user created)
      if (
        a.payment_status === "pending" &&
        (!a.expires_at || new Date(a.expires_at) > now)
      ) {
        pending_payment.push(a);
        continue;
      }

      // 3️⃣ Ongoing
      if (start <= now && now <= end) {
        ongoing.push(a);
        continue;
      }

      // 4️⃣ Upcoming
      if (start > now) {
        upcoming.push(a);
        continue;
      }

      // 5️⃣ Past
      if (end < now) {
        past.push(a);
        continue;
      }
    }

    /* -------------------------------------
       Final Response
    ------------------------------------- */
    await auditLog({
      ...cnx,
      action: "VIEWED",
      entityType: "APPOINTMENT",
      purpose: "operations",
      source: "user_portal",
      metadata: {
      success: true,
      role,
      count: {
        pending_payment: pending_payment.length,
        ongoing: ongoing.length,
        upcoming: upcoming.length,
        past: past.length,
        cancelled: cancelled.length,
      },
      pending_payment,
      ongoing,
      upcoming,
      past,
      cancelled,
    }
    })
    return NextResponse.json({
      success: true,
      role,
      count: {
        pending_payment: pending_payment.length,
        ongoing: ongoing.length,
        upcoming: upcoming.length,
        past: past.length,
        cancelled: cancelled.length,
      },
      pending_payment,
      ongoing,
      upcoming,
      past,
      cancelled,
    });
  } catch (err: any) {
    console.error("❌ Error fetching appointments:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
