import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const {user} = await requireUser();

  const body = await req.json();
  const {
    file_key,
    file_name,
    file_type,
    file_size,
  } = body;

  // 1️⃣ Verify appointment belongs to patient
  const { data: appointment, error } = await supabaseAdmin
    .from("appointments")
    .select("id, patient_id")
    .eq("id", params.id)
    .single();

  if (error || appointment.patient_id !== user?.patient_id) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // 2️⃣ Insert attachment metadata
  await supabaseAdmin.from("attachments").insert({
    appointment_id: params.id,
    patient_id: appointment.patient_id,
    file_url: file_key, // 🔑 S3 OBJECT KEY
    file_name,
    file_type,
    file_size,
  });

  return NextResponse.json({ ok: true });
}
