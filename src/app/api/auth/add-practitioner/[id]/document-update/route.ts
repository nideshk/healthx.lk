import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";

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
    if (!user || !["admin", "superadmin"].includes(user?.admin?.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documents } = await req.json();

    if (!Array.isArray(documents)) {
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

    // logAuditEvent({
    //   userId: user.auth_user_id,
    //   eventType: "UPDATED",
    //   entityType: "PRACTITIONER_APPLICATION_DOCUMENTS",
    //   metadata: { applicationId },
    // }).catch(console.error);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("document_added error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
