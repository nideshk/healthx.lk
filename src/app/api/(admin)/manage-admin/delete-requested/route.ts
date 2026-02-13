import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

export async function GET(req: NextRequest) {
  // 1️⃣ Auth
  const { authorized, user } = await requireUser(req);
  const cnx = getAuditContext(req, user);

  if (!authorized) {
    await auditLog({
      ...getAuditContext(req),
      action: "FAILED_ACCESS",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "unauthorized_view_delete_requests",
      },
    });

    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // 2️⃣ Must be admin
  if (!user?.admin) {
    await auditLog({
      ...cnx,
      action: "FAILED_ACCESS",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "non_admin_attempted_view_delete_requests",
      },
    });
    return NextResponse.json(
      { success: false, message: "Not an admin" },
      { status: 403 }
    );
  }

  // 3️⃣ Only SUPER ADMIN can view delete requests
  if (user.admin.role !== "superadmin") {
    await auditLog({
      ...cnx,
      action: "FAILED_ACCESS",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "non_superadmin_attempted_view_delete_requests",
        role: user.admin.role,
      },
    });


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
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "failed_to_fetch_delete_requests",
      },
    });

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch delete requests",
        error: error
      },
      { status: 500 }
    );
  }

  await auditLog({
    ...cnx,
    action: "VIEWED",
    entityType: "ADMIN_USER",
    purpose: "operations",
    source: "dashboard",
    metadata: {
      count: data.length
    }
  })

  return NextResponse.json({
    success: true,
    message: "Delete requests fetched successfully",
    data,
  });
}
