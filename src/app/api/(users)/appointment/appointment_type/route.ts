import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // client with service key not required for read
import { requireUser } from "@/lib/authGuard";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("appointment_type")
      .select("id, name, duration_mins, base_fee, max_attendee, platform_fee, extra_fee_per_attendee")
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

/* ------------------------------------------------
 * POST — Create appointment type (SUPER ADMIN)
 * ------------------------------------------------ */
export async function POST(req: Request) {
  try {
    const { authorized, role } = await requireUser();

    if (!authorized || role !== "superadmin") {
      return NextResponse.json(
        { error: "Only super admin can create appointment types" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      description,
      duration_mins,
      base_fee,
      platform_fee,
      max_attendee,
      extra_fee_per_attendee,
    } = body;

    if (!name || !duration_mins || base_fee == null || platform_fee == null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("appointment_type")
      .insert({
        name,
        description,
        duration_mins,
        base_fee,
        platform_fee,
        max_attendee: max_attendee ?? 1,
        extra_fee_per_attendee: extra_fee_per_attendee ?? 0,
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("POST /appointment-types:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create appointment type" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------
 * PUT — Update appointment type (?id=UUID)
 * (SUPER ADMIN)
 * ------------------------------------------------ */
export async function PUT(req: Request) {
  try {
    const { authorized, role } = await requireUser();

    if (!authorized || role !== "superadmin") {
      return NextResponse.json(
        { error: "Only super admin can update appointment types" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Appointment type id is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      name,
      description,
      duration_mins,
      base_fee,
      platform_fee,
      max_attendee,
      extra_fee_per_attendee,
    } = body;

    const { data, error } = await supabaseAdmin
      .from("appointment_type")
      .update({
        name,
        description,
        duration_mins,
        base_fee,
        platform_fee,
        max_attendee,
        extra_fee_per_attendee,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("PUT /appointment-types:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update appointment type" },
      { status: 500 }
    );
  }
}
