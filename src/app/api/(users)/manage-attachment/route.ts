import { auditLog } from "@/lib/audit/auditLog";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { requireUser } from "@/lib/authGuard";
import { supabaseClient } from "@/lib/supabaseClient";
import { get } from "http";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    console.log(user?.patient_id)

    /* user.patientId is trusted */
    const { data: files, error } = await supabaseClient
      .from("attachments")
      .select(
        "*"
      )
      .eq("patient_id", user?.patient_id)
      .order("uploaded_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch files" },
        { status: 500 }
      );
    }

    const cnx = getAuditContext(req, user);

    await auditLog({
      ...cnx,
      action: "VIEWED",
      entityType: "ATTACHMENT",
      purpose: "operations",
      source: "user_portal",
      metadata: files.map(f => f.id)
    });


    return NextResponse.json({ files });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: err.status || 401 }
    );
  }
}
