// app/api/auth/session/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { access_token, refresh_token } = await req.json();

    if (!access_token || !refresh_token) {
      return NextResponse.json(
        { error: "Missing tokens" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    /* ---------------------------------------
       ✅ THIS is the missing piece
    --------------------------------------- */
    const {
      data: { session, user },
      error,
    } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error || !session || !user) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();
    const isProd = process.env.NODE_ENV === "production";

    cookieStore.set("sb-access-token", session.access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: session.expires_in, // IMPORTANT
    });

    cookieStore.set("sb-refresh-token", session.refresh_token!, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Session exchange failed:", err);
    return NextResponse.json(
      { error: "Session error" },
      { status: 500 }
    );
  }
}
