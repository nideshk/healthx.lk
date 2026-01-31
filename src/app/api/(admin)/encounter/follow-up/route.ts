import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";
import { pool } from "@/lib/db";
import { notify } from "@/lib/notify";

export async function GET(req: NextRequest) {
  try {
    const { authorized, user } = await requireUser(req);
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = user?.profile?.role;
    if (role !== "admin" && role !== "superadmin") {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    const { rows } = await pool.query(`
      SELECT
        e.id                         AS encounter_id,
        e.follow_up_date,
        e.follow_up_comments,
        e.clinician_notes,
        e.follow_up_notified,
        e.created_at,

        a.ends_at                    AS completed_date,

        p.id                         AS patient_id,
        p.full_name                  AS patient_name,
        p.email                      AS patient_email,
        p.contact_number             AS patient_phone,

        pr.full_name                 AS practitioner_name
      FROM phi.encounters e
      JOIN phi.appointments a   ON a.id = e.appointment_id
      JOIN phi.patients p       ON p.id = a.patient_id
      JOIN phi.practitioners pr ON pr.id = a.practitioner_id
      WHERE
        e.follow_up_needed = true
        AND e.follow_up_notified = false
        AND a.status = 'completed'
        AND a.patient_id IS NOT NULL
      ORDER BY e.follow_up_date ASC
    `);

    const items = rows.map((r) => ({
      encounter_id: r.encounter_id,
      completed_date: r.completed_date,
      follow_up_date: r.follow_up_date,
      follow_up_comments: r.follow_up_comments,
      clinician_notes: r.clinician_notes,
      patient: {
        id: r.patient_id,
        name: r.patient_name,
        email: r.patient_email,
        phone: r.patient_phone,
      },
      doctor: r.practitioner_name,
    }));

    const cnx = getAuditContext(req, user);
    await auditLog({
      ...cnx,
      action: "VIEWED",
      entityType: "FOLLOW_UP_ENCOUNTERS",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        count: items.length,
      },
    });

    return NextResponse.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (err: any) {
    console.error("Pending follow-up fetch error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------
   PATCH: Notify follow-up & mark as notified
------------------------------------------ */
export async function PATCH(req: NextRequest) {
  try {
    const { authorized, user } = await requireUser(req);
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["admin", "superadmin"].includes(user?.role)) {
      return NextResponse.json(
        { message: "Access denied" },
        { status: 403 }
      );
    }

    const { encounter_id } = await req.json();
    if (!encounter_id) {
      return NextResponse.json(
        { message: "encounter_id is required" },
        { status: 400 }
      );
    }

    // Fetch encounter + joins
    const { rows } = await pool.query(
      `
      SELECT
        e.id,
        e.follow_up_date,
        e.follow_up_comments,
        e.clinician_notes,
        e.follow_up_notified,

        p.id            AS patient_id,
        p.full_name     AS patient_name,
        p.email         AS patient_email,

        pr.full_name    AS practitioner_name
      FROM phi.encounters e
      JOIN phi.appointments a   ON a.id = e.appointment_id
      JOIN phi.patients p       ON p.id = a.patient_id
      JOIN phi.practitioners pr ON pr.id = a.practitioner_id
      WHERE e.id = $1
      `,
      [encounter_id]
    );

    if (!rows.length) {
      return NextResponse.json(
        { message: "Encounter not found" },
        { status: 404 }
      );
    }

    const data = rows[0];

    if (data.follow_up_notified) {
      return NextResponse.json(
        { message: "Already notified" },
        { status: 409 }
      );
    }

    // Notify patient
    await notify({
      userId: data.patient_id,
      role: "patient",
      eventType: "follow_up_reminder",
      title: "Follow-up Reminder",
      message: `
Hello ${data.patient_name},

Dr. ${data.practitioner_name} has requested a follow-up.

Follow-up Date:
${new Date(data.follow_up_date).toLocaleDateString()}

Regards,
Clinecxa Team
      `.trim(),
      channels: ["email"],
      payload: {
        email: data.patient_email,
        encounter_id,
      },
    });

    // Update encounter
    await pool.query(
      `
      UPDATE phi.encounters
      SET
        follow_up_notified = true,
        updated_at = now()
      WHERE id = $1
      `,
      [encounter_id]
    );

    const cnx = getAuditContext(req as any, user);
    await auditLog({
      ...cnx,
      action: "UPDATED",
      entityType: "ENCOUNTER",
      entityId: encounter_id,
      purpose: "treatment",
      source: "dashboard",
      metadata: {
        event: "follow_up_notified",
        channel: "email",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Follow-up notified successfully",
    });
  } catch (err) {
    console.error("Follow-up notify error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
