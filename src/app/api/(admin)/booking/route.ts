
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const STATUS_MAP: Record<string, string[]> = {
  total: ["scheduled", "confirmed", "completed", "cancelled", "pending"],
  upcoming: ["scheduled", "confirmed", "pending"],
  completed: ["completed"],
  cancelled: ["cancelled"],
};

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { auditLog } from "@/lib/audit/auditLog";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  console.log("NEW API HITS")
  try {
    const { authorized, user } = await requireUser(req);
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin =
      user?.admin && ["admin", "superadmin"].includes(user.admin.role);

    const isPractitioner =
      user?.role === "practitioner" && user?.practitioner_id;

    if (!isAdmin && !isPractitioner) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const type = searchParams.get("type");

    if (!fromDate || !toDate || !type) {
      return NextResponse.json(
        { success: false, message: "`from`, `to`, and `type` are required" },
        { status: 400 }
      );
    }

    const STATUS_MAP: Record<string, string[]> = {
      total: ["scheduled", "confirmed", "completed", "cancelled", "pending"],
      upcoming: ["scheduled", "confirmed", "pending"],
      completed: ["completed"],
      cancelled: ["cancelled"],
    };

    const statuses = STATUS_MAP[type];
    if (!statuses) {
      return NextResponse.json(
        { success: false, message: "Invalid type filter" },
        { status: 400 }
      );
    }

    const perPage = Math.min(Number(searchParams.get("per_page")) || 20, 100);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const offset = (page - 1) * perPage;

    const params: any[] = [
      `${fromDate}T00:00:00`,
      `${toDate}T23:59:59`,
      statuses,
      perPage,
      offset,
    ];

    let practitionerFilter = "";
    if (isPractitioner) {
      practitionerFilter = `AND a.practitioner_id = $6`;
      params.push(user.practitioner_id);
    }

    const { rows } = await pool.query(
      `
      SELECT
        a.id,
        a.starts_at,
        a.ends_at,
        a.cancellation_reason,
        a.payment_status,
        a.status,
        a.notes,

        p.full_name AS patient_name,
        p.email AS patient_email,

        pr.full_name AS practitioner_name,
        pr.contact_email AS practitioner_email,

        at.name AS appointment_type_name,

        COUNT(*) OVER() AS total_count
      FROM phi.appointments a
      LEFT JOIN phi.patients p ON p.id = a.patient_id
      LEFT JOIN phi.practitioners pr ON pr.id = a.practitioner_id
      LEFT JOIN phi.appointment_type at ON at.id = a.appointment_type_id
      WHERE
        a.starts_at >= $1
        AND a.starts_at <= $2
        AND a.status = ANY($3)
        ${practitionerFilter}
      ORDER BY a.starts_at DESC
      LIMIT $4 OFFSET $5
      `,
      params
    );

    const total = rows.length ? Number(rows[0].total_count) : 0;

    const formatted = rows.map((a) => {
      const start = new Date(a.starts_at);
      const end = a.ends_at ? new Date(a.ends_at) : null;

      return {
        id: a.id,
        appointment_date: start.toISOString().split("T")[0],
        start_time: start.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        end_time: end
          ? end.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
          : null,
        status: a.status,
        payment_status: a.payment_status ?? "unpaid",
        patient: a.patient_name
          ? { name: a.patient_name, email: a.patient_email }
          : null,
        practitioner: a.practitioner_name
          ? {
            name: a.practitioner_name,
            email: a.practitioner_email,
          }
          : null,
        appointment_type: a.appointment_type_name,
        cancellation_reason: a.cancellation_reason,
        notes: a.notes,
      };
    });

    const cnx = getAuditContext(req, user);
    await auditLog({
      ...cnx,
      action: "VIEWED",
      entityType: "APPOINTMENT",
      purpose: "operations",
      source: "dashboard",
      metadata: { total, page, perPage },
    });

    return NextResponse.json({
      success: true,
      meta: {
        total,
        page,
        per_page: perPage,
        total_pages: Math.ceil(total / perPage),
      },
      data: formatted,
    });
  } catch (err: any) {
    console.error("Appointments fetch error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);

    const {
      patient_id,
      practitioner_id,
      appointment_type_id,
      starts_at,
      ends_at,
      fee,
      currency,
    } = await req.json();

    if (
      !patient_id ||
      !practitioner_id ||
      !appointment_type_id ||
      !starts_at ||
      !ends_at
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const { rows } = await pool.query(
      `
      INSERT INTO phi.appointments (
        patient_id,
        practitioner_id,
        appointment_type_id,
        starts_at,
        ends_at,
        status,
        payment_status,
        expires_at,
        fee_charged,
        currency,
        source,
        created_by_admin_id
      )
      VALUES ($1,$2,$3,$4,$5,'pending','pending',$6,$7,$8,'admin',$9)
      RETURNING *
      `,
      [
        patient_id,
        practitioner_id,
        appointment_type_id,
        starts_at,
        ends_at,
        expiresAt.toISOString(),
        fee,
        currency || "INR",
        user?.admin?.id || user?.auth_user_id,
      ]
    );

    return NextResponse.json(
      { success: true, appointment: rows[0] },
      { status: 201 }
    );
  } catch (err) {
    console.error("Create appointment error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
