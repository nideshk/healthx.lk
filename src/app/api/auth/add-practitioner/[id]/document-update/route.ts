import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: practitioner_id } = await context.params;
    if (!practitioner_id) {
      return NextResponse.json(
        { error: "Missing application id" },
        { status: 400 }
      );
    }

    const { user, role } = await requireUser(req);

    const cnx = getAuditContext(req, user);

    if (!user || !["admin", "superadmin"].includes(user?.admin?.role as any)) {
      await auditLog({
        ...cnx,
        action: "FAILED",
        source: "dashboard",
        entityType: "PRACTITIONER",
        entityId: practitioner_id,
        metadata: {
          "error": "Unauthorized"
        },
        purpose: "operations",
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documents } = await req.json();

    if (!Array.isArray(documents)) {
      await auditLog({
        ...cnx,
        action: "FAILED",
        source: "dashboard",
        entityType: "PRACTITIONER",
        entityId: practitioner_id,
        metadata: {
          "error": "Invalid documents"
        },
        purpose: "operations",
      })
      return NextResponse.json(
        { error: "documents must be an array" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("practitioners")
      .update({
        documents,
        updated_at: new Date().toISOString(),
      })
      .eq("id", practitioner_id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    await auditLog({
      ...cnx,
      action: "UPDATED",
      source: "dashboard",
      entityType: "PRACTITIONER",
      entityId: practitioner_id,
      metadata: {
        type: "document",
        "practitioner_id": practitioner_id,
      },
      purpose: "operations",
    })

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("document_added error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
