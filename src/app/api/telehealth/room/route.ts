import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get("room");

  if (!room) {
    return NextResponse.json({ error: "Missing room parameter" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("appointments")
    .select(`
      id,
      room_key,
      telehealth_url,
      starts_at,
      ends_at,
      status,
      appointment_type:appointment_type_id ( name, duration_mins ),
      patient:patient_id ( id, full_name ),
      practitioner:practitioner_id ( id, full_name )
    `)
    .eq("room_key", room)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  // Only returning non-sensitive metadata here
  return NextResponse.json({
    id: data.id,
    room_key: data.room_key,
    telehealth_url: data.telehealth_url,
    starts_at: data.starts_at,
    ends_at: data.ends_at,
    status: data.status,
    appointment_type: data.appointment_type,
    patient: data.patient,
    practitioner: data.practitioner,
  });
}
