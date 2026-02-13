import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { authorized, user, role } = await requireUser(req);
  const cnx = getAuditContext(req, user);

  if (!authorized || !["admin", "superadmin"].includes(role)) {

    await auditLog({
      ...cnx,
      action: "FAILED_ACCESS",
      entityType: "BILLING",
      entityId: id,
      purpose: "payment",
      source: "dashboard",
      metadata: {
        reason: "unauthorized_refund_status_update",
        role,
      },
    });

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { action, admin_note } = await req.json();

  if (action === "mark_refunded") {
    const { error } = await supabaseAdmin
      .from("refunds")
      .update({
        status: "refunded",
        refunded_by: user?.admin?.id || user?.auth_user_id,
        refunded_at: new Date().toISOString(),
        admin_note,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "requested"); // safety guard

    if (error) {
      await auditLog({
        ...cnx,
        action: "FAILED",
        entityType: "BILLING",
        entityId: id,
        purpose: "payment",
        source: "dashboard",
        metadata: {
          reason: "mark_refunded_update_failed",
        },
      });
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    await auditLog({
      ...cnx,
      action: "UPDATED",
      entityType: "BILLING",
      entityId: id,
      purpose: "payment",
      source: "dashboard",
      metadata: {
        event: "mark_refunded",
      },
    });
    return NextResponse.json({
      success: true,
      status: "refunded",
      refund_id: id,
    });
  }

  if (action === "reject") {
    const { error } = await supabaseAdmin
      .from("refunds")
      .update({
        status: "rejected",
        refunded_by: user?.admin?.id || user?.auth_user_id,
        admin_note,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "requested");

    if (error) {
      await auditLog({
        ...cnx,
        action: "FAILED",
        entityType: "BILLING",
        entityId: id,
        purpose: "payment",
        source: "dashboard",
        metadata: {
          reason: "reject_refund_update_failed",
        },
      });

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    await auditLog({
      ...cnx,
      action: "UPDATED",
      entityType: "BILLING",
      entityId: id,
      purpose: "payment",
      source: "dashboard",
      metadata: {
        event: "refund_rejected",
      },
    });


    return NextResponse.json({
      success: true,
      status: "rejected",
      refund_id: id,
    });
  }

  await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "BILLING",
      entityId: id,
      purpose: "payment",
      source: "dashboard",
      metadata: {
        reason: "missing_action",
      },
  });

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
