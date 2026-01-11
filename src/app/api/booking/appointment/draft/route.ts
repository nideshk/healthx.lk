import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  const {user} = await requireUser();
  const { data } = await req.json();

  const { data: existing } = await supabaseAdmin
    .from("appointment_draft")
    .select("*")
    .eq("patient_id", user?.patient_id)
    .single();

  if (!existing) {
    const { data: created } = await supabaseAdmin
      .from("appointment_draft")
      .insert({
        patient_id: user?.patient_id,
        data,
        status: "DRAFT",
      })
      .select()
      .single();

    return NextResponse.json(created);
  }

  // locked or completed → ignore
  if (existing.status !== "DRAFT") {
    return NextResponse.json(existing);
  }

  const { data: updated } = await supabaseAdmin
    .from("appointment_draft")
    .update({
      data,
      version: existing.version + 1,
    })
    .eq("patient_id", user?.patient_id)
    .select()
    .single();

  return NextResponse.json(updated);
}
