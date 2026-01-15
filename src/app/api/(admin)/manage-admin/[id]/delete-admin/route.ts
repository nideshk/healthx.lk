import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // 1️⃣ Auth
  const { id: targetAdminId } = await context.params;
  const { authorized, user } = await requireUser(_req);
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user?.admin) {
    auditLog({
      ...getAuditContext(_req as any, user),
      action: "FAILED_ACCESS",
      entityType: "ADMIN_USER",
      entityId: targetAdminId,
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "insufficient_privileges"
      }
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
      { status: 400 }
    );
  }

  // 3️⃣ Fetch target admin
  const { data: target, error } = await supabaseAdmin
    .from("admin_users")
    .select("id, supabase_user_id, role, delete_status")
    .eq("id", targetAdminId)
    .single();

  if (error || !target) {
    return NextResponse.json(
      { success: false, message: "Admin not found" },
      { status: 404 }
    );
  }

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

  // 5️⃣ NORMAL ADMIN → CANNOT TOUCH SUPER ADMIN (AT ALL)
  if (
    user.admin.role === "admin" &&
    target.role === "superadmin"
  ) {
    auditLog({
      ...getAuditContext(_req as any, user),
      action: "FAILED_ACCESS",
      entityType: "ADMIN_USER",
      entityId: targetAdminId,
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "insufficient_privileges"
      }
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
    // Policy check only when deleting another super admin
    if (
      target.role === "superadmin" &&
      !user.admin.policies.includes("super_admin:delete")
    ) {
      auditLog({
        ...getAuditContext(_req as any, user),
        action: "FAILED_ACCESS",
        entityType: "ADMIN_USER",
        entityId: targetAdminId,
        purpose: "operations",
        source: "dashboard",
        metadata: {
          reason: "insufficient_privileges"
        }
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
    await supabaseAdmin
      .from("admin_users")
      .update({
        is_active: false,
        delete_status: "deleted",
        delete_approved_by: user.admin.id,
        delete_approved_at: deletedAt,
      })
      .eq("id", targetAdminId);

    // 7️⃣ Soft delete profiles
    await supabaseAdmin
      .from("profiles")
      .update({
        is_active: false,
        deleted_at: deletedAt,
      })
      .eq("id", target.supabase_user_id);

    // ✅ Audit: admin requested delete
    auditLog({
      ...getAuditContext(_req as any, user),
      action: "DELETED",
      entityType: "ADMIN_USER",
      entityId: targetAdminId,
      purpose: "operations",
      source: "dashboard",
      metadata: {
        event: "delete_requested"
      }
    });


    return NextResponse.json({
      success: true,
      message: "Admin deleted successfully",
    });
  }

  /**
   * ----------------------------------------------------
   * NORMAL ADMIN → REQUEST DELETE (NORMAL ADMIN ONLY)
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

  // 8️⃣ Create delete request (soft state)
  await supabaseAdmin
    .from("admin_users")
    .update({
      delete_status: "requested",
      delete_requested_by: user.admin.id,
      delete_requested_at: new Date().toISOString(),
    })
    .eq("id", targetAdminId);

  return NextResponse.json(
    {
      success: true,
      message: "Delete request submitted",
    },
    { status: 202 }
  );
}
