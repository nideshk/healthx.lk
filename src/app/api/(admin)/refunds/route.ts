import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const { authorized, user, role } = await requireUser(req);

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ❌ Practitioners do not access refunds
  if (role === "practitioner") {
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
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

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
export async function PATCH(req: Request) {
  const { authorized, user, role } = await requireUser(req);

  if (!authorized || !["admin", "superadmin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { refund_id, action, admin_note } = body;

  if (!refund_id || !action) {
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

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
