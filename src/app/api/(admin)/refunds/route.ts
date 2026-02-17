import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

export async function GET(req: NextRequest) {
  const { authorized, user, role } = await requireUser(req);
  const cnx = getAuditContext(req, user);
  if (!authorized) {
    await auditLog({
      ...cnx,
      action: "FAILED_ACCESS",
      entityType: "BILLING",
      purpose: "payment",
      source: "dashboard",
      metadata: {
        reason: "unauthorized_view_refunds",
      },
    });

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }


  // ❌ Practitioners do not access refunds
  if (role === "practitioner") {
    await auditLog({
      ...cnx,
      action: "FAILED_ACCESS",
      entityType: "BILLING",
      purpose: "payment",
      source: "dashboard",
      metadata: {
        reason: "practitioner_attempted_view_refunds",
      },
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /* ------------------------------------------------
     BASE QUERY
  ------------------------------------------------ */
  let query = supabaseAdmin
    .from("refunds")
    .select(`
      *,
      appointment:appointment_id (
        id,
        starts_at,
        status
      ),
      patient:patient_id (
        full_name,
        email
      )
    `)
    .order("created_at", { ascending: false });

  /* ------------------------------------------------
     ROLE-BASED FILTERING
  ------------------------------------------------ */
  if (role === "patient") {
    if (!user?.patient_id) {
      await auditLog({
        ...cnx,
        action: "FAILED",
        entityType: "BILLING",
        purpose: "payment",
        source: "dashboard",
        metadata: {
          reason: "patient_profile_missing",
        },
      });
      return NextResponse.json(
        { error: "Patient profile not found" },
        { status: 400 }
      );
    }

    query = query.eq("patient_id", user.patient_id);
  }

  // admin / superadmin → no filter

  const { data, error } = await query;

  if (error) {
    await auditLog({
        ...cnx,
        action: "FAILED",
        entityType: "BILLING",
        purpose: "payment",
        source: "dashboard",
        metadata: {
          reason: "failed_to_fetch_refunds",
        },
      });
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  await auditLog({
    ...cnx,
    action: "VIEWED",
    entityType: "BILLING",
    purpose: "payment",
    source: "dashboard",
    metadata: {
      count: data?.length ?? 0,
      role,
    },
  });

  return NextResponse.json({
    status: "success",
    refunds: data || [],
  });
}


/* =====================================================
   PATCH /api/refunds
   - admin only
   - mark refunded / reject
===================================================== */
export async function PATCH(req: NextRequest) {
  const { authorized, user, role } = await requireUser(req);
  const cnx = getAuditContext(req, user);

  if (!authorized || !["admin", "superadmin"].includes(role)) {
    await auditLog({
      ...cnx,
      action: "FAILED_ACCESS",
      entityType: "BILLING",
      purpose: "payment",
      source: "dashboard",
      metadata: {
        reason: "unauthorized_refund_update",
        role,
      },
    });

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { refund_id, action, admin_note } = body;

  if (!refund_id || !action) {
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "BILLING",
      purpose: "payment",
      source: "dashboard",
      metadata: {
        reason: "missing_refund_id_or_action",
      },
    });
    return NextResponse.json(
      { error: "refund_id and action are required" },
      { status: 400 }
    );
  }

  if (action === "mark_refunded") {
    await supabaseAdmin
      .from("refunds")
      .update({
        status: "refunded",
        refunded_by: user?.admin?.id || user?.auth_user_id,
        refunded_at: new Date().toISOString(),
        admin_note,
        updated_at: new Date().toISOString(),
      })
      .eq("id", refund_id)
      .eq("status", "requested"); // safety guard

    await auditLog({
      ...cnx,
      action: "UPDATED",
      entityType: "BILLING",
      entityId: refund_id,
      purpose: "payment",
      source: "dashboard",
      metadata: {
        event: "mark_refunded",
      },
    });

    return NextResponse.json({ success: true });
  }

  if (action === "reject") {
    await supabaseAdmin
      .from("refunds")
      .update({
        status: "rejected",
        refunded_by: user?.admin?.id || user?.auth_user_id,
        admin_note,
        updated_at: new Date().toISOString(),
      })
      .eq("id", refund_id)
      .eq("status", "requested");

    await auditLog({
      ...cnx,
      action: "UPDATED",
      entityType: "BILLING",
      entityId: refund_id,
      purpose: "payment",
      source: "dashboard",
      metadata: {
        event: "refund_rejected",
      },
    });


    return NextResponse.json({ success: true });
  }
  await auditLog({
    ...cnx,
    action: "FAILED",
    entityType: "BILLING",
    entityId: refund_id,
    purpose: "payment",
    source: "dashboard",
    metadata: {
      reason: "invalid_refund_action",
      action,
    },
  });

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
