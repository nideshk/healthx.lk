import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

export async function GET(req: NextRequest) {
  try {
    // 🔐 Authentication check
    const { authorized, user } = await requireUser(req);
    if (!authorized) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const role = user?.profile?.role;

    // 🔒 Authorization check
    if (role !== "admin" && role !== "superadmin") {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    // ✅ Fetch applications (NO encrypted_password)
    const { data, error } = await supabaseAdmin
      .from("practitioner_applications")
      .select(`
        id,
        email,
        first_name,
        last_name,
        state,
        city,
        qualification,
        specialization,
        experience_years,
        status,
        user_created,
        user_id,
        created_at
      `)
      .eq("user_created", false)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    const cnx = getAuditContext(req, user);
    await auditLog({
      ...cnx,
      action: "EXPORTED",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        success: true,
        data,
      }
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
