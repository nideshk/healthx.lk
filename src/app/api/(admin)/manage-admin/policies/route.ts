import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

export async function GET(req: NextRequest) {
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

  // 4️⃣ Fetch all policies
  const { data, error } = await supabaseAdmin
    .from("policies")
    .select("code")
    .order("code", { ascending: true });

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch policies",
      },
      { status: 500 }
    );
  }

  
  const cnx = getAuditContext(req, user);

  await auditLog({
    ...cnx,
    action: "VIEWED",
    entityType: "ADMIN_USER",
    purpose: "operations",
    source: "dashboard",
    metadata: data.map(p => p.code)
  });


  return NextResponse.json({
    success: true,
    message: "Policies fetched successfully",
    data: data.map(p => p.code),
  });
}
