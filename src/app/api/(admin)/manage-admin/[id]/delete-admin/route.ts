import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";
import { pool } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: targetAdminId } = await context.params;

  // 1️⃣ Auth
  const { authorized, user } = await requireUser(req);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user?.admin) {
    await auditLog({
      ...getAuditContext(req as any, user),
      action: "FAILED_ACCESS",
      entityType: "ADMIN_USER",
      entityId: targetAdminId,
      purpose: "operations",
      source: "dashboard",
      metadata: { reason: "insufficient_privileges" },
    });

    return NextResponse.json(
      { success: false, message: "Not an admin" },
      { status: 403 }
    );
  }

  // 2️⃣ Self-delete protection
  if (user.admin.id === targetAdminId) {
    return NextResponse.json(
      { success: false, message: "You cannot delete yourself" },
      { status: 403 }
    );
  }

  // 3️⃣ Fetch target admin
  const { rows } = await pool.query(
    `
    SELECT id, supabase_user_id, role, delete_status
    FROM phi.admin_users
    WHERE id = $1
    `,
    [targetAdminId]
  );

  if (!rows.length) {
    return NextResponse.json(
      { success: false, message: "Admin not found" },
      { status: 404 }
    );
  }

  const target = rows[0];

  // 4️⃣ Already deleted
  if (target.delete_status === "deleted") {
    return NextResponse.json(
      { success: false, message: "Admin already deleted" },
      { status: 400 }
    );
  }

  /**
   * ----------------------------------------------------
   * ROLE & POLICY GUARDS
   * ----------------------------------------------------
   */

  // 5️⃣ NORMAL ADMIN → CANNOT TOUCH SUPER ADMIN
  if (user.admin.role === "admin" && target.role === "superadmin") {
    await auditLog({
      ...getAuditContext(req as any, user),
      action: "FAILED_ACCESS",
      entityType: "ADMIN_USER",
      entityId: targetAdminId,
      purpose: "operations",
      source: "dashboard",
      metadata: { reason: "insufficient_privileges" },
    });

    return NextResponse.json(
      {
        success: false,
        message:
          "Normal admins cannot delete or request deletion of super admins",
      },
      { status: 403 }
    );
  }

  /**
   * ----------------------------------------------------
   * SUPER ADMIN → DIRECT SOFT DELETE
   * ----------------------------------------------------
   */
  if (user.admin.role === "superadmin") {
    if (
      target.role === "superadmin" &&
      !user.admin.policies.includes("super_admin:delete")
    ) {
      await auditLog({
        ...getAuditContext(req as any, user),
        action: "FAILED_ACCESS",
        entityType: "ADMIN_USER",
        entityId: targetAdminId,
        purpose: "operations",
        source: "dashboard",
        metadata: { reason: "missing_policy" },
      });

      return NextResponse.json(
        {
          success: false,
          message: "Missing super_admin:delete policy",
        },
        { status: 403 }
      );
    }

    const deletedAt = new Date().toISOString();

    // 6️⃣ Soft delete admin_users
    await pool.query(
      `
      UPDATE phi.admin_users
      SET
        is_active = false,
        delete_status = 'deleted',
        delete_approved_by = $1,
        delete_approved_at = $2
      WHERE id = $3
      `,
      [user.admin.id, deletedAt, targetAdminId]
    );

    // 7️⃣ Soft delete profiles
    await pool.query(
      `
      UPDATE phi.profiles
      SET
        is_active = false,
        deleted_at = $1
      WHERE id = $2
      `,
      [deletedAt, target.supabase_user_id]
    );

    await auditLog({
      ...getAuditContext(req as any, user),
      action: "DELETED",
      entityType: "ADMIN_USER",
      entityId: targetAdminId,
      purpose: "operations",
      source: "dashboard",
      metadata: { event: "delete_approved" },
    });

    return NextResponse.json({
      success: true,
      message: "Admin deleted successfully",
    });
  }

  /**
   * ----------------------------------------------------
   * NORMAL ADMIN → REQUEST DELETE
   * ----------------------------------------------------
   */
  if (!user.admin.policies.includes("admin:delete")) {
    return NextResponse.json(
      {
        success: false,
        message: "Missing admin:delete policy",
      },
      { status: 403 }
    );
  }

  // 8️⃣ Create delete request
  await pool.query(
    `
    UPDATE phi.admin_users
    SET
      delete_status = 'requested',
      delete_requested_by = $1,
      delete_requested_at = now()
    WHERE id = $2
    `,
    [user.admin.id, targetAdminId]
  );

  return NextResponse.json(
    {
      success: true,
      message: "Delete request submitted",
    },
    { status: 202 }
  );
}
