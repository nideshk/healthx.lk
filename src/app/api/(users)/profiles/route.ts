import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";


type Body = { enabled: boolean };

function validateBody(b: any): string | null {
  if (!b || typeof b.enabled !== "boolean") return "'enabled' must be a boolean";
  return null;
}

export async function POST(req: Request) {
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
  const cookieStore = cookies();
  const supabase = supabaseAdmin

  // get authenticated user from session (no redirects)
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) {
    console.error("getUser error:", userErr);
    return NextResponse.json({ error: "Unable to verify session" }, { status: 401 });
  }
  const user = userData?.user;
  console.log(user.id)
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = user.id;

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

    return NextResponse.json({ success: true, profile: updated }, { status: 200 });
  } catch (err: any) {
    console.error("multi-factor update error:", err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
