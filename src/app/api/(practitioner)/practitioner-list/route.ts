import { auditLog } from "@/lib/audit/auditLog";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // 🔐 AUTH
  const { authorized, response, user } = await requireUser();
  if (!authorized) return response;
  const cnx = getAuditContext(req, user);

  const role = user?.profile?.role;
  if (role !== "admin" && role !== "superadmin") {
    return NextResponse.json(
      { success: false, message: "Access denied" },
      { status: 403 }
    );
  }

  // 🔍 QUERY
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q"); // keep null if missing

  // 📡 DB
  const { data, error } = await supabaseAdmin.rpc(
    "search_practitioners_by_name",
    { search_text: q }
  );

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  await auditLog({
    ...cnx,
    action: "EXPORTED",
    entityType: "PRACTITIONER",
    purpose: "operations",
    source: "dashboard",
    metadata: {
      success: true,
      query: q,
      resultCount: data.length,
      result: data,
    },
  })

  return NextResponse.json({
    success: true,
    data
  });
}
