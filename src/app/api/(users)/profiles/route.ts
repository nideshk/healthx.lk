import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";


type Body = { enabled: boolean };

function validateBody(b: any): string | null {
  if (!b || typeof b.enabled !== "boolean") return "'enabled' must be a boolean";
  return null;
}

export async function POST(req: NextRequest) {

  const { user } = await requireUser(req);
  const cnx = getAuditContext(req, user);

  // parse body
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const vErr = validateBody(body);
  if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });

  // create route handler client with cookies => uses the caller's session
  const supabase = supabaseAdmin

  // get authenticated user from session (no redirects)
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) {
    console.error("getUser error:", userErr);
    return NextResponse.json({ error: "Unable to verify session" }, { status: 401 });
  }
  const users = userData?.user;
  if (!users?.id) {
    await auditLog({
      ...cnx,
      action: "FAILED",
      source: "dashboard",
      entityType: "PROFILE",
      entityId: "",
      metadata: {
        "error": "Unauthorized"
      },
      purpose: "operations",
    })
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = users.id;

  try {
    // Ensure profile exists
    const { data: profile, error: fetchErr } = await supabaseAdmin
      .from("profiles")
      .select("id, multi_factor")
      .eq("id", userId)
      .limit(1)
      .maybeSingle();

    if (fetchErr) {
      console.error("fetch profile error:", fetchErr);
      return NextResponse.json({ error: "Failed to read profile" }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Update the multi_factor flag
    const { data: updated, error: updErr } = await supabaseAdmin
      .from("profiles")
      .update({ multi_factor: body.enabled })
      .eq("id", userId)
      .select()
      .maybeSingle();

    if (updErr) {
      console.error("update profile error:", updErr);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    await auditLog({
      ...cnx,
      action: "UPDATED",
      source: "dashboard",
      entityType: "PROFILE",
      entityId: userId,
      metadata: {
        "profile_id": userId,
        "profile_name": updated?.full_name,
        "profile_email": updated?.email,
        "profile_phone": updated?.phone,
      },
      purpose: "operations",
    })

    return NextResponse.json({ success: true, profile: updated }, { status: 200 });
  } catch (err: any) {
    console.error("multi-factor update error:", err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
