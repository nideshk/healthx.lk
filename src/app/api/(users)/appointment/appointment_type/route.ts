import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // client with service key not required for read
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

const PUBLIC_APPOINTMENT_TYPE_FIELDS = [
  "id",
  "name",
  "duration_mins",
  "max_attendee",
] as const;

export async function GET(req: Request) {
  try {
    const { data, error } = await supabaseAdmin
      .from("appointment_type")
      .select("id, name, duration_mins, base_fee, max_attendee, platform_fee, extra_fee_per_attendee")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching appointment types:", error);
      return NextResponse.json({ error: "Failed to fetch appointment types" }, { status: 500 });
    }

    const rows = data || [];
    let appointment_types: Array<Record<string, unknown>> = rows.map((row) => {
      const pub: Record<string, unknown> = {};
      for (const field of PUBLIC_APPOINTMENT_TYPE_FIELDS) {
        pub[field] = row[field];
      }
      return pub;
    });

    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { authorized, role } = await requireUser(req);
      if (authorized && role === "superadmin") {
        appointment_types = rows;
      }
    }

    return NextResponse.json({ appointment_types });
  } catch (err: any) {
    console.error("GET /appointment-types:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { authorized, role, user } = await requireUser(req);

    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (role !== "superadmin") {
      return NextResponse.json(
        { error: "Only super admin can create appointment types" },
        { status: 403 }
      );
    }

    const cnx = getAuditContext(req, user);

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

    await auditLog({
      ...cnx,
      action: "CREATED",
      entityType: "APPOINTMENT_TYPE",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        info: "Created new appointment type",
        data: data
      }
    })

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
    const { authorized, role } = await requireUser(req);

    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (role !== "superadmin") {
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
