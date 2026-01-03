import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { authorized, user, role } = await requireUser();
  if (!authorized || !["admin", "superadmin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { action, admin_note } = await req.json();

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
      .eq("id", params.id);

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
      .eq("id", params.id);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
