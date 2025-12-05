// app/api/consultation/audit-log/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const body = await req.json();


    const { data, error } = await supabaseClient
      .from("consultation_audit_log")
      .insert([
        {
          appointment_id: body.appointmentId,
          user_id: body.userId,
          event_type: body.eventType,
          metadata: body.metadata ?? {},
        },
      ]);

    if (error) {
      console.error("DB Insert Error:", error);
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
