import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    /* -------------------------------------------
     * AUTH
     * ----------------------------------------- */
    const { authorized, user, response } = await requireUser(_req);
    if (!authorized || !user) return response;

    /* -------------------------------------------
     * PARAMS (ASYNC)
     * ----------------------------------------- */
    const { id: notificationId } = await context.params;

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID missing" },
        { status: 400 }
      );
    }

    /* -------------------------------------------
     * VERIFY OWNERSHIP
     * ----------------------------------------- */
    const { data: notification, error: fetchErr } = await supabaseAdmin
      .from("notifications")
      .select("id, user_id, status")
      .eq("id", notificationId)
      .single();

    if (fetchErr || !notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    if (notification.user_id !== user.auth_user_id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    /* -------------------------------------------
     * NO-OP IF ALREADY READ
     * ----------------------------------------- */
    if (notification.status === "read") {
      return NextResponse.json({
        success: true,
        message: "Notification already marked as read",
      });
    }

    /* -------------------------------------------
     * UPDATE STATUS
     * ----------------------------------------- */
    const { error: updateErr } = await supabaseAdmin
      .from("notifications")
      .update({
        status: "read",
      })
      .eq("id", notificationId);

    if (updateErr) {
      return NextResponse.json(
        { error: "Failed to update notification" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (err: any) {
    console.error("❌ PATCH notification/read error:", err);

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
