import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";


export async function POST() {
  const {user} = await requireUser();

  await supabaseAdmin
    .from("appointment_draft")
    .update({ status: "LOCKED" })
    .eq("patient_id", user?.patient_id);

  return NextResponse.json({ ok: true });
}
