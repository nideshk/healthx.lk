import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // client with service key not required for read

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("appointment_type")
      .select("id, name, duration_mins, base_fee, max_attendee")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching appointment types:", error);
      return NextResponse.json({ error: "Failed to fetch appointment types" }, { status: 500 });
    }

    return NextResponse.json({ appointment_types: data || [] });
  } catch (err: any) {
    console.error("GET /appointment-types:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
