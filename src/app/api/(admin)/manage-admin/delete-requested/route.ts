import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";

export async function GET() {
  // 1️⃣ Auth
  const { authorized, user, response } = await requireUser();
  if (!authorized) return response;

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

  // 4️⃣ Fetch delete requests (delete_status = requested)
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select(`
      id,
      full_name,
      email,
      role,
      delete_status,
      delete_requested_at,
      requested_by:delete_requested_by (
        id,
        full_name,
        role
      )
    `)
    .eq("delete_status", "requested")
    .order("delete_requested_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch delete requests",
        error: error
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Delete requests fetched successfully",
    data,
  });
}
