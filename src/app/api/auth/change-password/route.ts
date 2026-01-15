import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { cookies } from 'next/headers'
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Body = {
  new_password: string;
};

function validatePassword(pw: string) {
  const minLength = pw.length >= 8;
  const lower = /[a-z]/.test(pw);
  const upper = /[A-Z]/.test(pw);
  const number = /[0-9]/.test(pw);
  const special = /[!@#$%^&*(),.?":{}|<>]/.test(pw);

  if (!minLength) return "Password must be at least 8 characters";
  if (!lower) return "Password must contain a lowercase letter";
  if (!upper) return "Password must contain an uppercase letter";
  if (!number) return "Password must contain a number";
  if (!special) return "Password must contain a special character";

  return null;
}

export async function POST(request: Request) {
  // debugger;
  console.log(request)
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const cookieStore = cookies()
  const supabase = supabaseAdmin


  const { new_password } = body;
  if (!new_password) {
    return NextResponse.json({ error: "Missing new_password" }, { status: 400 });
  }

  // Validate password
  const validationError = validatePassword(new_password);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  // Get authenticated user
  const { authorized, user } = await requireUser(request);
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user?.auth_user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const targetUserId = user.auth_user_id; // ALWAYS the logged-in user
  console.log(user)
  try {
    // Update user's password using admin API (server-side)
    const { data, error } = await supabase.auth.updateUser({
      password: new_password,
    });

    if (error) {
      console.error("Password update failed:", error);
      return NextResponse.json({ error: error.message ?? "Failed to update password" }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: { id: data?.user } }, { status: 200 });

  } catch (err: any) {
    console.error("Password update error:", err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
