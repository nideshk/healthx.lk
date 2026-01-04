// app/api/services/route.js

import { requireUser } from "@/lib/authGuard";
import { supabaseClient } from "@/lib/supabaseClient";

export async function GET() {
  try {
    const { authorized, response, user } = await requireUser();
    if (!authorized) return response;

    // Fetch all appointment types from your DB
    const { data: appointmentTypes, error } = await supabaseClient
      .from("appointment_type")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("DB error:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Final response
    return Response.json(
      {
        services: appointmentTypes.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          duration: t.duration_mins,
          price: t.base_fee,
          max_attendees: t.max_attendee,
        })),
        total: appointmentTypes.length,
        user: user.email,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Services API error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
