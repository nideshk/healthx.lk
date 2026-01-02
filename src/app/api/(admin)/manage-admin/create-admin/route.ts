import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";

export async function POST(req: Request) {
  // 1️⃣ Auth
  const { authorized, user, response } = await requireUser();
  if (!authorized) return response;

  if (!user?.admin) {
    return NextResponse.json({ message: "Not an admin" }, { status: 403 });
  }

  // 2️⃣ Body
  const {
    full_name,
    gender,
    email,
    password,
    confirm_password,
    role, // "admin" | "superadmin"
  } = await req.json();

  if (
    !full_name ||
    !gender ||
    !email ||
    !password ||
    !confirm_password ||
    !role
  ) {
    return NextResponse.json(
      { message: "All fields are required" },
      { status: 400 }
    );
  }

  if (password !== confirm_password) {
    return NextResponse.json(
      { message: "Passwords do not match" },
      { status: 400 }
    );
  }

  if (!["admin", "superadmin"].includes(role)) {
    return NextResponse.json(
      { message: "Invalid role" },
      { status: 400 }
    );
  }

  // 3️⃣ Authorization
  console.log(user)
  // Adding SUPER ADMIN
  if (role === "superadmin") {
    if (user.admin.role !== "superadmin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (!user.admin.policies.includes("super_admin:add")) {
      return NextResponse.json({ message: "This super admin has missing policy" }, { status: 403 });
    }
  }

  // Adding NORMAL ADMIN
  if (role === "admin") {
    if (
      user.admin.role === "admin" &&
      !user.admin.policies.includes("admin:add")
    ) {
      return NextResponse.json({ message: "This admin has Missing policy" }, { status: 403 });
    }
  }

  // 4️⃣ Create auth user
  const { data: authUser, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

  if (authError || !authUser.user) {
    return NextResponse.json(
      { message: authError?.message || "Auth creation failed" },
      { status: 500 }
    );
  }

  const authUserId = authUser.user.id;

  // 5️⃣ Profile
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: authUserId,
      display_name: full_name,
      role,
      created_at: new Date().toISOString(),
    });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    return NextResponse.json(
      { message: "Profile creation failed" },
      { status: 500 }
    );
  }

  // 6️⃣ Admin user
  const { error: adminError } = await supabaseAdmin
    .from("admin_users")
    .insert({
      supabase_user_id: authUserId,
      full_name,
      gender,
      email,
      role,
      created_at: new Date().toISOString(),
    });

  if (adminError) {
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    return NextResponse.json(
      { message: "Admin creation failed" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: "Admin created successfully" },
    { status: 200 }
  );
}
