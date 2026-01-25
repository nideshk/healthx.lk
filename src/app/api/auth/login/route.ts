import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notify } from "@/lib/notify";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const cookieStore = cookies();
    const supabase = supabaseAdmin

    /* ------------------------------------------------
     * AUTHENTICATE USER
     * ------------------------------------------------ */
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || "Invalid credentials" },
        { status: 400 }
      );
    }

    /* ------------------------------------------------
     * FETCH PROFILE + ROLE
     * ------------------------------------------------ */
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, role")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    /* ------------------------------------------------
     * 🔔 LOGIN NOTIFICATION
     * ------------------------------------------------ */
    await notify({
      userId: profile.id,
      role: profile.role, // patient | practitioner | admin | superadmin
      eventType: "auth.login",
      title: "New Login Detected",
      message: "You’ve successfully signed in to your Medx account.",
      channels: ["email"], // 👈 keep email optional
      payload: {
        ip: req.headers.get("x-forwarded-for") || "unknown",
        userAgent: req.headers.get("user-agent"),
        loggedAt: new Date().toISOString(),
      },
    });

    /* ------------------------------------------------
     * RESPONSE
     * ------------------------------------------------ */
    return NextResponse.json({
      user: data.user,
      profile: {
        id: profile.id,
        display_name: profile.first_name,
        role: profile.role,
      },
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Unexpected login error" },
      { status: 500 }
    );
  }
}
