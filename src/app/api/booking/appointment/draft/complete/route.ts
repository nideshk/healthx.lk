import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { user } = await requireUser(req);

  await supabaseAdmin
    .from("appointment_draft")
    .update({ status: "COMPLETED" })
    .eq("patient_id", user?.patient_id);

  return NextResponse.json({ ok: true });
}
