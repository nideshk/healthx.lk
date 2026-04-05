import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

/* -----------------------------------------
 * RBAC helper
 * ----------------------------------------- */
function getAvailablePoliciesForRole(
  role: string,
  allPolicies: { code: string; description: string | null }[]
) {
  return allPolicies.filter((p) => {
    // payment → visible to all
    if (p.code.startsWith("payment:")) return true;

    // superadmin → ONLY super_admin policies
    if (role === "superadmin") {
      return p.code.startsWith("super_admin:");
    }

    // admin → ONLY admin policies
    if (role === "admin") {
      return p.code.startsWith("admin:");
    }

    return false;
  });
}

/* =========================================
 * GET: Fetch admins + policies
 * ========================================= */
export async function GET(req: NextRequest) {
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
        reason: "unauthorized_fetch_admins_policies",
      },
    });

    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // 2️⃣ Must be superadmin
  if (!user?.admin || !["admin", "superadmin"].includes(user.admin.role)) {
    await auditLog({
      ...cnx,
      action: "FAILED_ACCESS",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "insufficient_role_fetch_admins",
        role: user?.admin?.role,
      },
    });

    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 }
    );
  }
  // Must be admin or superadmin
  if (!user?.admin || !["admin", "superadmin"].includes(user.admin.role)) {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 }
    );
  }

  const isSuperAdmin = user.admin.role === "superadmin";

  //  Fetch all policies (source of truth)
  const { data: allPoliciesRaw, error: policyError } = await supabaseAdmin
    .from("policies")
    .select("code, description");

  if (policyError) {
    await auditLog({
      ...getAuditContext(req, user),
      action: "FAILED",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "failed_to_fetch_policies",
      },
    });

    return NextResponse.json(
      { success: false, message: "Failed to fetch policies" },
      { status: 500 }
    );
  }

  const allPolicies: { code: string; description: string | null }[] =
    (allPoliciesRaw ?? []).map((p) => ({
      code: String(p.code),
      description: p.description ?? null,
    }));

  // 5️⃣ Fetch admins with assigned policies
  let adminQuery = supabaseAdmin
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
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  /**
   * Admins should NOT see superadmins
   */
  if (!isSuperAdmin) {
    adminQuery = adminQuery.eq("role", "admin");
  }

  const { data: admins, error } = await adminQuery;

  if (error) {
    await auditLog({
      ...getAuditContext(req, user),
      action: "FAILED",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "failed_to_fetch_admins",
      },
    });

    return NextResponse.json(
      { success: false, message: "Failed to fetch admins and policies" },
      { status: 500 }
    );
  }

  // 6️⃣ Normalize response
  const result = admins.map((admin) => {
    const assigned = admin.admin_policy_map.map(
      (p: { policy_code: string }) => p.policy_code
    );

    const available = getAvailablePoliciesForRole(
      admin.role,
      allPolicies
    ).filter(
      (p) => !assigned.includes(p.code)
    );

    if (!isSuperAdmin) {
      // Admin view — NO policies
      return {
        id: admin.id,
        full_name: admin.full_name,
        email: admin.email,
        role: admin.role,
      };
    }

    // Superadmin view — include policies
    return {
      id: admin.id,
      full_name: admin.full_name,
      email: admin.email,
      role: admin.role,
      policies: {
        assigned,
        available,
      },
    };
  });


  await auditLog({
    ...cnx,
    action: "VIEWED",
    entityType: "ADMIN_USER",
    purpose: "operations",
    source: "dashboard",
    metadata: {
      data: result,
      count: result.length
    }
  });

  return NextResponse.json({
    success: true,
    message: "Admins and policies fetched successfully",
    data: result,
  });
}

/* =========================================
 * PUT: Update admin policies
 * ========================================= */
export async function PUT(req: NextRequest) {
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
        reason: "unauthorized_update_admin_policy",
      },
    });

    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // 2️⃣ Must be superadmin
  if (!user?.admin || user.admin.role !== "superadmin") {
    await auditLog({
      ...cnx,
      action: "FAILED_ACCESS",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "non_superadmin_attempted_policy_update",
        role: user?.admin?.role,
      },
    });

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

  // 4️⃣ Fetch target admin (to know role)
  const { data: targetAdmin, error: adminError } = await supabaseAdmin
    .from("admin_users")
    .select("id, role")
    .eq("id", targetAdminId)
    .single();

  if (adminError || !targetAdmin) {
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ADMIN_USER",
      entityId: targetAdminId,
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "target_admin_not_found",
      },
    });
    return NextResponse.json(
      { success: false, message: "Admin not found" },
      { status: 404 }
    );
  }

  // 5️⃣ Fetch all policies again (validation source)
  const { data: allPoliciesRaw, error: policyError } = await supabaseAdmin
    .from("policies")
    .select("code, description");

  if (policyError) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch policies" },
      { status: 500 }
    );
  }

  const allPolicies: { code: string; description: string | null }[] =
    (allPoliciesRaw ?? []).map((p) => ({
      code: String(p.code),
      description: p.description ?? null,
    }));

  // 6️⃣ Validate policies for target admin role
  const allowedPolicyCodes = getAvailablePoliciesForRole(
    targetAdmin.role,
    allPolicies
  ).map((p) => p.code);

  const invalid = policies.filter(
    (p: string) => !allowedPolicyCodes.includes(p)
  );

  if (invalid.length > 0) {
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ADMIN_USER",
      entityId: targetAdminId,
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "invalid_policies_for_role",
        invalid,
      },
    });
    return NextResponse.json(
      {
        success: false,
        message: "Invalid policies for this role",
        invalid_policies: invalid,
      },
      { status: 400 }
    );
  }

  // 7️⃣ Replace policies
  await supabaseAdmin
    .from("admin_policy_map")
    .delete()
    .eq("admin_id", targetAdminId);

  if (policies.length > 0) {
    await supabaseAdmin.from("admin_policy_map").insert(
      policies.map((code: string) => ({
        admin_id: targetAdminId,
        policy_code: code,
      }))
    );
  }

  await auditLog({
    ...cnx,
    action: "UPDATED",
    entityType: "ADMIN_USER",
    entityId: targetAdminId,
    purpose: "operations",
    source: "dashboard",
    metadata: {
      admin_id: targetAdminId,
      policies,
    }
  });


  return NextResponse.json({
    success: true,
    message: "Policies updated successfully",
    data: {
      admin_id: targetAdminId,
      policies,
    },
  });
}
