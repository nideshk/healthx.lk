import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import {
  applicationUploadKeyAllows,
  readApplicationUploadKey,
} from "@/lib/applicationUploadKey";

function emailsMatch(left: unknown, right: unknown) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const a = left.trim().toLowerCase();
  const b = right.trim().toLowerCase();
  return a.length > 0 && a === b;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await context.params;
    if (!applicationId) {
      return NextResponse.json(
        { error: "Missing application id" },
        { status: 400 }
      );
    }

    const keyAllows = applicationUploadKeyAllows(
      readApplicationUploadKey(req),
      applicationId
    );

    if (!keyAllows) {
      const auth = await requireUser(req);
      if (!auth.authorized || !auth.user) return auth.response;

      const { data: application, error: fetchError } = await supabaseAdmin
        .from("practitioner_applications")
        .select("id, user_id, email, contact_email")
        .eq("id", applicationId)
        .maybeSingle();

      if (fetchError) {
        console.error("document_added application lookup failed");
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 }
        );
      }

      if (!application) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const isAdmin =
        auth.user.role === "admin" || auth.user.role === "superadmin";
      const sessionEmail =
        auth.user.user?.email || auth.user.profile?.email || "";
      const ownsApplication =
        (!!application.user_id &&
          application.user_id === auth.user.auth_user_id) ||
        emailsMatch(application.email, sessionEmail) ||
        emailsMatch(application.contact_email, sessionEmail);

      if (!isAdmin && !ownsApplication) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
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
      console.error("document_added update failed");
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("document_added error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
