import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";

export async function GET() {
  // 1️⃣ Auth
  const { authorized, user, response } = await requireUser();
  if (!authorized) return response;

  // 2️⃣ Must be super admin
  if (!user?.admin || user.admin.role !== "superadmin") {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 }
    );
  }

  // 3️⃣ Must have manage policy permission
  if (!user.admin.policies.includes("super_admin:manage_policy")) {
    return NextResponse.json(
      {
        success: false,
        message: "Missing super_admin:manage_policy policy",
      },
      { status: 403 }
    );
  }

  // 4️⃣ Fetch ALL admins with their policies
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select(`
      id,
      full_name,
      email,
      role,
      admin_policy_map (
        policy_code
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch admins and policies" },
      { status: 500 }
    );
  }

  // 5️⃣ Normalize response
  const result = data.map((admin) => ({
    id: admin.id,
    full_name: admin.full_name,
    email: admin.email,
    role: admin.role,
    policies: admin.admin_policy_map.map((p) => p.policy_code),
  }));

  return NextResponse.json({
    success: true,
    message: "Admins and policies fetched successfully",
    data: result,
  });
}

export async function PUT(req: Request) {
  // 1️⃣ Auth
  const { authorized, user, response } = await requireUser();
  if (!authorized) return response;

  // 2️⃣ Must be super admin
  if (!user?.admin || user.admin.role !== "superadmin") {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 }
    );
  }

  // 3️⃣ Must have manage policy permission
  if (!user.admin.policies.includes("super_admin:manage_policy")) {
    return NextResponse.json(
      {
        success: false,
        message: "Missing super_admin:manage_policy policy",
      },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const targetAdminId = searchParams.get("id");

  if (!targetAdminId) {
    return NextResponse.json(
      { success: false, message: "Missing admin id" },
      { status: 400 }
    );
  }

  const { policies } = await req.json();

  if (!Array.isArray(policies)) {
    return NextResponse.json(
      { success: false, message: "Invalid policies payload" },
      { status: 400 }
    );
  }

  // 4️⃣ Replace policies
  await supabaseAdmin
    .from("admin_policies")
    .delete()
    .eq("admin_user_id", targetAdminId);

  if (policies.length > 0) {
    await supabaseAdmin.from("admin_policies").insert(
      policies.map((code: string) => ({
        admin_user_id: targetAdminId,
        policy_code: code,
      }))
    );
  }

  return NextResponse.json({
    success: true,
    message: "Policies updated successfully",
    data: {
      admin_id: targetAdminId,
      policies,
    },
  });
}


