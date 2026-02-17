import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notify } from "@/lib/notify";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";
import { count } from "console";

export const dynamic = "force-dynamic";


export async function GET(req: NextRequest) {
  const { authorized, user } = await requireUser(req);
  const cnx = getAuditContext(req, user);
  if (!authorized){
      await auditLog({
        ...cnx,
        action: "FAILED",
        entityType: "FOLLOW_UP_ENCOUNTERS",
        purpose: "operations",
        source: "dashboard",
        metadata: {
          reason: "Unauthorized access attempt"
        }
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["admin", "superadmin"].includes(user?.profile?.role)) {
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "FOLLOW_UP_ENCOUNTERS",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "Access denied - insufficient role",
        role: user?.profile?.role
      }
    });
    return NextResponse.json({ message: "Access denied" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 10);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const offset = (page - 1) * limit;

  /* -------------------------------------------------- */
  /* 1️⃣ Fetch encounters                               */
  /* -------------------------------------------------- */

  let query = supabaseAdmin
    .from("encounters")
    .select("*", { count: "exact" })
    .eq("follow_up_needed", true)
    .eq("follow_up_notified", false)
    .order("follow_up_date", { ascending: true });

  if (from) query = query.gte("follow_up_date", `${from}T00:00:00`);
  if (to) query = query.lte("follow_up_date", `${to}T23:59:59`);

  const { data: encounters, count, error } = await query.range(
    offset,
    offset + limit - 1
  );

  if (error) {
    console.error("Follow-up fetch error:", error);
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "FOLLOW_UP_ENCOUNTERS",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "Database fetch failed"
      }
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!encounters?.length) {
    return NextResponse.json({
      success: true,
      meta: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        from,
        to,
      },
      items: [],
    });
  }

  /* -------------------------------------------------- */
  /* 2️⃣ Fetch related appointments                     */
  /* -------------------------------------------------- */

  const appointmentIds = encounters.map((e) => e.appointment_id);

  const { data: appointments } = await supabaseAdmin
    .from("appointments")
    .select("id, ends_at, status, patient_id, practitioner_id")
    .in("id", appointmentIds)

  const appointmentMap = Object.fromEntries(
    (appointments ?? []).map((a) => [a.id, a])
  );

  /* -------------------------------------------------- */
  /* 3️⃣ Fetch patients + practitioners                 */
  /* -------------------------------------------------- */

  const patientIds = appointments?.map((a) => a.patient_id) ?? [];
  const practitionerIds = appointments?.map((a) => a.practitioner_id) ?? [];

  const { data: patients } = await supabaseAdmin
    .from("patients")
    .select("id, full_name, email")
    .in("id", patientIds);

  const { data: practitioners } = await supabaseAdmin
    .from("practitioners")
    .select("id, full_name")
    .in("id", practitionerIds);

  const patientMap = Object.fromEntries(
    (patients ?? []).map((p) => [p.id, p])
  );

  const practitionerMap = Object.fromEntries(
    (practitioners ?? []).map((p) => [p.id, p])
  );

  /* -------------------------------------------------- */
  /* 4️⃣ Merge final response                           */
  /* -------------------------------------------------- */

  const items = encounters
    .map((enc) => {
      const appt = appointmentMap[enc.appointment_id];
      if (!appt) return null;

      const patient = patientMap[appt.patient_id];
      const practitioner = practitionerMap[appt.practitioner_id];

      return {
        encounter_id: enc.id,
        completed_date: appt.ends_at,
        follow_up_date: enc.follow_up_date,
        follow_up_comments: enc.follow_up_comments,
        clinician_notes: enc.clinician_notes,
        patient: {
          id: patient?.id ?? null,
          name: patient?.full_name ?? "-",
          email: patient?.email ?? "-",
        },
        doctor: practitioner?.full_name ?? "-",
      };
    })
    .filter(Boolean);

  /* -------------------------------------------------- */
  /* 5️⃣ AUDIT LOG (RESTORED)                           */
  /* -------------------------------------------------- */

  await auditLog({
    ...cnx,
    action: "VIEWED",
    entityType: "FOLLOW_UP_ENCOUNTERS",
    purpose: "operations",
    source: "dashboard",
    metadata: {
      filters: {
        from,
        to,
        page,
        limit,
      },
      result_count: items.length,
      total_records: count ?? 0,
    },
  });

  /* -------------------------------------------------- */
  /* 6️⃣ Response                                       */
  /* -------------------------------------------------- */

  return NextResponse.json({
    success: true,
    meta: {
      page,
      limit,
      total: count ?? 0,
      totalPages: count ? Math.ceil(count / limit) : 0,
      from,
      to,
    },
    items,
  });
}



/* -----------------------------------------
   PATCH: Notify follow-up & mark as notified
------------------------------------------ */
export async function PATCH(req: NextRequest) {
  // 1️⃣ Auth
  const { authorized, user } = await requireUser(req);
  const cnx = getAuditContext(req, user);

  if (!authorized) {
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ENCOUNTER",
      purpose: "treatment",
      source: "dashboard",
      metadata: {
        reason: "Unauthorized follow-up notify attempt"
      }
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2️⃣ Role check
  if (!["admin", "superadmin"].includes(user?.role)) {
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ENCOUNTER",
      purpose: "treatment",
      source: "dashboard",
      metadata: {
        reason: "Access denied - insufficient role",
        role: user?.role
      }
    });
    return NextResponse.json(
      { message: "Access denied" },
      { status: 403 }
    );
  }

  // 3️⃣ Parse body
  const { encounter_id } = await req.json();

  if (!encounter_id) {
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ENCOUNTER",
      purpose: "treatment",
      source: "dashboard",
      metadata: {
        reason: "Missing encounter_id"
      }
    });

    return NextResponse.json(
      { message: "encounter_id is required" },
      { status: 400 }
    );
  }

  // 4️⃣ Fetch encounter
  const { data, error } = await supabaseAdmin
    .from("encounters")
    .select(`
      id,
      follow_up_date,
      follow_up_comments,
      clinician_notes,
      follow_up_notified,
      created_at,

      appointments (
        id,
        ends_at,
        status,

        patients (
          id,
          full_name,
          email,
          contact_number
        ),

        practitioners (
          id,
          full_name
        )
      )
    `)
    .eq("id", encounter_id)
    .single();


  if (error) {
    console.error("notifying error:", error);
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ENCOUNTER",
      entityId: encounter_id,
      purpose: "treatment",
      source: "dashboard",
      metadata: {
        reason: "Failed to fetch encounter"
      }
    });

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  if (!data) {
    console.error("Encounter not found", error);
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ENCOUNTER",
      entityId: encounter_id,
      purpose: "treatment",
      source: "dashboard",
      metadata: {
        reason: "Encounter not found"
      }
    });

    return NextResponse.json(
      { success: false, error: "Encounter not found" },
      { status: 500 }
    );
  }

  const appointment = Array.isArray(data.appointments)
    ? data.appointments[0]
    : data.appointments;

  if (!appointment) {
    throw new Error("Appointment missing");
  }

  const patient = Array.isArray(appointment.patients)
    ? appointment.patients[0]
    : appointment.patients;

  const practitioner = Array.isArray(appointment.practitioners)
    ? appointment.practitioners[0]
    : appointment.practitioners;

  if (!patient || !practitioner) {
    throw new Error("Patient or practitioner missing");
  }



  if (error || !data) {
    return NextResponse.json(
      { message: "Encounter not found" },
      { status: 404 }
    );
  }

  // 5️⃣ Prevent duplicate notify
  if (data.follow_up_notified) {
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ENCOUNTER",
      entityId: encounter_id,
      purpose: "treatment",
      source: "dashboard",
      metadata: {
        reason: "Follow-up already notified"
      }
    });

    return NextResponse.json(
      { message: "Already notified" },
      { status: 409 }
    );
  }


  // 6️⃣ Notify
  await notify({
    userId: patient.id,
    role: "patient",
    eventType: "follow_up_reminder",
    title: "Follow-up Reminder",
    message: `
Hello ${patient.full_name},

Dr. ${practitioner.full_name} has requested a follow-up.

Follow-up Date:
${new Date(data.follow_up_date).toLocaleDateString()}

Regards,
Clinecxa Team
    `.trim(),
    channels: ["email"],
    payload: {
      email: patient.email,
      encounter_id,
    },
  });

  // 7️⃣ Update state
  const { error: updateError } = await supabaseAdmin
    .from("encounters")
    .update({
      follow_up_notified: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", encounter_id);

  // 8️⃣ Audit: follow-up notification sent
  auditLog({
    ...cnx,
    action: "UPDATED",
    entityType: "ENCOUNTER",
    entityId: encounter_id,
    purpose: "treatment",
    source: "dashboard",
    metadata: {
      event: "follow_up_notified",
      channel: "email"
    }
  });


  if (updateError) {
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ENCOUNTER",
      entityId: encounter_id,
      purpose: "treatment",
      source: "dashboard",
      metadata: {
        reason: "Failed to update encounter state"
      }
    });

    return NextResponse.json(
      { message: "Failed to update encounter" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Follow-up notified successfully",
  });
}
