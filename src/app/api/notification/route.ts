import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { supabaseClient } from "@/lib/supabaseClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { authorized, user } = await requireUser(req);
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("user_id", user?.auth_user_id)
    .in("channel", ["in_app"])
    .neq("status", "read")
    .limit(20);

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }

  return NextResponse.json({ notifications: data });
}
