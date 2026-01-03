import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    /* ---------------------------------------
     * 1️⃣ Fetch services
     * --------------------------------------- */
    let servicesQuery = supabaseClient
      .from("services")
      .select("*")
      .order("created_at", { ascending: false });

    if (!includeInactive) {
      servicesQuery = servicesQuery.eq("active", true);
    }

    const { data: services, error: servicesError } = await servicesQuery;

    if (servicesError) {
      console.error("Services fetch error:", servicesError);
      return NextResponse.json(
        { error: "Failed to fetch services" },
        { status: 500 }
      );
    }

    /* ---------------------------------------
     * 2️⃣ Fetch appointment types
     * --------------------------------------- */
    const { data: appointmentTypes, error: typeError } =
      await supabaseAdmin
        .from("appointment_type")
        .select(
          "id, name, duration_mins, base_fee, max_attendee, platform_fee, extra_fee_per_attendee"
        )
        .eq("is_active", true)
        .order("name", { ascending: true });

    if (typeError) {
      console.error("Appointment type fetch error:", typeError);
      return NextResponse.json(
        { error: "Failed to fetch appointment types" },
        { status: 500 }
      );
    }

    /* ---------------------------------------
     * 3️⃣ Unified response
     * --------------------------------------- */
    return NextResponse.json({
      success: true,
      services: services ?? [],
      appointment_types: appointmentTypes ?? [],
    });
  } catch (err: any) {
    console.error("FORM CONFIG API ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
