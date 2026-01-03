import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { authorized, user, role } = await requireUser();
  if (!authorized || !["admin", "superadmin"].includes(role)) {
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
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

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
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: "rejected",
      refund_id: id,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
