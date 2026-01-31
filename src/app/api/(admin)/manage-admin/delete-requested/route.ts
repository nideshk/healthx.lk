import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  // 1️⃣ Auth
  const { authorized, user } = await requireUser(req);
  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // 2️⃣ Must be admin
  if (!user?.admin) {
    return NextResponse.json(
      { success: false, message: "Not an admin" },
      { status: 403 }
    );
  }

  // 3️⃣ Only SUPER ADMIN can view delete requests
  if (user.admin.role !== "superadmin") {
    return NextResponse.json(
      {
        success: false,
        message: "Only super admins can view delete requests",
      },
      { status: 403 }
    );
  }

  // 4️⃣ Fetch delete requests (AWS)
  const { rows } = await pool.query(`
    SELECT
      a.id,
      a.full_name,
      a.email,
      a.role,
      a.delete_status,
      a.delete_requested_at,

      r.id        AS requested_by_id,
      r.full_name AS requested_by_name,
      r.role      AS requested_by_role
    FROM phi.admin_users a
    LEFT JOIN phi.admin_users r
      ON r.id = a.delete_requested_by
    WHERE a.delete_status = 'requested'
    ORDER BY a.delete_requested_at DESC
  `);

  // Shape response exactly like Supabase output
  const data = rows.map((row) => ({
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    role: row.role,
    delete_status: row.delete_status,
    delete_requested_at: row.delete_requested_at,
    requested_by: row.requested_by_id
      ? {
        id: row.requested_by_id,
        full_name: row.requested_by_name,
        role: row.requested_by_role,
      }
      : null,
  }));

  // 5️⃣ Audit
  const cnx = getAuditContext(req, user);
  await auditLog({
    ...cnx,
    action: "VIEWED",
    entityType: "ADMIN_USER",
    purpose: "operations",
    source: "dashboard",
    metadata: {
      count: data.length,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Delete requests fetched successfully",
    data,
  });
}
