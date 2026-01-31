import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { requireUser } from "@/lib/authGuard";
import { auditLog } from "@/lib/audit/auditLog";

export const dynamic = "force-dynamic";

//to be removed since not used - verify with shravya

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { user } = await requireUser(req);

    if (!id) {
      return NextResponse.json(
        { error: "Missing practitioner ID" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const specialization = searchParams.get("specialization");

    // ---- SQL construction (safe) ----
    let sql = `
      SELECT *
      FROM phi.practitioners
      WHERE id = $1
    `;
    const values: any[] = [id];

    if (specialization) {
      sql += ` AND specialization ILIKE $2`;
      values.push(`%${specialization}%`);
    }

    sql += `
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const { rows } = await pool.query(sql, values);

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { message: "Practitioner not found", data: [] },
        { status: 404 }
      );
    }

    const practitioner = rows[0];

    // ---- Audit logging ----
    const cnx = getAuditContext(req, user);

    await auditLog({
      ...cnx,
      action: "VIEWED",
      entityType: "PRACTITIONER",
      purpose: "operations",
      entityId: practitioner.id,
      source: "dashboard",
      metadata: {
        practitioner_viewed: practitioner,
      },
    });

    return NextResponse.json(
      {
        message: "Practitioner retrieved successfully",
        data: practitioner,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Practitioner fetch error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
