import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

export async function POST(req: NextRequest) {
  // 1️⃣ Auth
  const { authorized, user } = await requireUser(req);
  const cnx = getAuditContext(req, user);

  if (!authorized) {
    await auditLog({
      ...cnx,
      action: "FAILED_ACCESS",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "unauthorized_admin_creation_attempt",
      },
    });

    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!user?.admin) {
    await auditLog({
      ...cnx,
      action: "FAILED_ACCESS",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "non_admin_attempted_admin_creation",
      },
    });

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
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "missing_required_fields",
      },
    });

    return NextResponse.json(
      { message: "All fields are required" },
      { status: 400 }
    );
  }

  if (password !== confirm_password) {
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "password_mismatch",
      },
    });

    return NextResponse.json(
      { message: "Passwords do not match" },
      { status: 400 }
    );
  }

  if (!["admin", "superadmin"].includes(role)) {
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "invalid_role",
        attempted_role: role,
      },
    });

    return NextResponse.json(
      { message: "Invalid role" },
      { status: 400 }
    );
  }

  // Adding SUPER ADMIN
  if (role === "superadmin") {
    if (user.admin.role !== "superadmin") {
      await auditLog({
        ...cnx,
        action: "FAILED_ACCESS",
        entityType: "ADMIN_USER",
        purpose: "operations",
        source: "dashboard",
        metadata: {
          reason: "superadmin_required",
        },
      });

      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (!user.admin.policies.includes("super_admin:add")) {
      await auditLog({
        ...cnx,
        action: "FAILED_ACCESS",
        entityType: "ADMIN_USER",
        purpose: "operations",
        source: "dashboard",
        metadata: {
          reason: "missing_super_admin_add_policy",
        },
      });

      return NextResponse.json({ message: "This super admin has missing policy" }, { status: 403 });
    }
  }

  // Adding NORMAL ADMIN
  if (role === "admin") {
    if (
      user.admin.role === "admin" &&
      !user.admin.policies.includes("admin:add")
    ) {
      await auditLog({
        ...cnx,
        action: "FAILED_ACCESS",
        entityType: "ADMIN_USER",
        purpose: "operations",
        source: "dashboard",
        metadata: {
          reason: "missing_admin_add_policy",
        },
      });
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
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "auth_user_creation_failed",
      },
    });

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
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ADMIN_USER",
      entityId: authUserId,
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "profile_creation_failed",
      },
    });
    return NextResponse.json(
      { message: "Profile creation failed" },
      { status: 500 }
    );
  }

  // 6️⃣ Admin user
  const { data: adminData, error: adminError } = await supabaseAdmin
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
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ADMIN_USER",
      entityId: authUserId,
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "admin_table_insert_failed",
      },
    });

    return NextResponse.json(
      { message: "Admin creation failed" },
      { status: 500 }
    );
  }

  await auditLog({
    ...cnx,
    action: "CREATED",
    entityType: "ADMIN_USER",
    entityId: authUserId,
    purpose: "operations",
    source: "dashboard",
    metadata: {
      user_created: adminData,
      role,
    }
  })

  return NextResponse.json(
    { message: "Admin created successfully" },
    { status: 200 }
  );
}
