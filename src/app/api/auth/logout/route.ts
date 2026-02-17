// /api/auth/logout/route.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = supabaseAdmin;
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ message: "Logged out successfully" });
}
