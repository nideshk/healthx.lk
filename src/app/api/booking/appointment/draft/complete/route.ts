import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST() {
  const {user} = await requireUser();

  await supabaseAdmin
    .from("appointment_draft")
    .update({ status: "COMPLETED" })
    .eq("patient_id", user?.patient_data);

  return NextResponse.json({ ok: true });
}
