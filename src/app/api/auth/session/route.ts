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

    /* ---------------------------------------
       1️⃣ Validate ACCESS TOKEN directly
    --------------------------------------- */
    const supabaseWithToken = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false },
        global: {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabaseWithToken.auth.getUser();

    if (!user || error) {
      return NextResponse.json(
        { error: "Invalid access token" },
        { status: 401 }
      );
    }

    /* ---------------------------------------
       2️⃣ Set cookies (NOW possible)
    --------------------------------------- */
    const cookieStore = await cookies();
    const isProd = process.env.NODE_ENV === "production";

    cookieStore.set("sb-access-token", access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
    });

    cookieStore.set("sb-refresh-token", refresh_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
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
