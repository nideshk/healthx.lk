import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { logAuditEvent } from "@/lib/logAuditEvent";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try{
  const { id: applicationId } = await context.params;  
    if (!applicationId) {
      return NextResponse.json(
        { error: "Missing application id" },
        { status: 400 }
      );
    }

    const { user, role } = await requireUser();
    if (!user || !["admin", "superadmin"].includes(role)) {
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
      .from("practitioner_applications")
      .update({
        documents,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    logAuditEvent({
      userId: user.auth_user_id,
      eventType: "UPDATED",
      entityType: "PRACTITIONER_APPLICATION_DOCUMENTS",
      metadata: { applicationId },
    }).catch(console.error);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("document_added error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
