import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";
import { pool } from "@/lib/db"; // 🔁 MIGRATED

export async function POST(req: NextRequest) {
  // 1️⃣ Auth
  const { authorized, user } = await requireUser(req);
  if (!authorized)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

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

  // 3️⃣ Authorization checks (unchanged)
  if (role === "superadmin") {
    if (user.admin.role !== "superadmin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (!user.admin.policies.includes("super_admin:add")) {
      return NextResponse.json(
        { message: "Missing super_admin:add policy" },
        { status: 403 }
      );
    }
  }

  if (
    role === "admin" &&
    user.admin.role === "admin" &&
    !user.admin.policies.includes("admin:add")
  ) {
    return NextResponse.json(
      { message: "Missing admin:add policy" },
      { status: 403 }
    );
  }

  // 4️⃣ Create auth user (Supabase stays)
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

  try {
    // 5️⃣ Create profile (AWS)
    await pool.query(
      `
      INSERT INTO phi.profiles (
        id,
        display_name,
        role,
        created_at
      )
      VALUES ($1, $2, $3, now())
      `,
      [authUserId, full_name, role]
    );

    // 6️⃣ Create admin user (AWS)
    await pool.query(
      `
      INSERT INTO phi.admin_users (
        supabase_user_id,
        full_name,
        gender,
        email,
        role,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, now())
      `,
      [authUserId, full_name, gender, email, role]
    );
  } catch (dbError) {
    // 🔥 Rollback auth user if DB insert fails
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    return NextResponse.json(
      { message: "Admin creation failed" },
      { status: 500 }
    );
  }

  // 7️⃣ Audit
  const cnx = getAuditContext(req, user);
  await auditLog({
    ...cnx,
    action: "CREATED",
    entityType: "ADMIN_USER",
    entityId: authUserId,
    purpose: "operations",
    source: "dashboard",
    metadata: {
      full_name,
      role,
    },
  });

  return NextResponse.json(
    { message: "Admin created successfully" },
    { status: 200 }
  );
}
