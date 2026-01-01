import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { authorized, response, user } = await requireUser();
    if (!authorized) return response;

    // Only admin can read ALL bookings
    if (user?.role !== "admin") {
      return NextResponse.json(
        { error: "Only admin can access all bookings" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q") || "";
    const perPage = Number(searchParams.get("per_page")) || 50;
    const order = searchParams.get("order") || "asc";
    const sort = searchParams.get("sort") || "created_at";
    const page = Number(searchParams.get("page")) || 1;

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabaseClient
      .from("appointments")
      .select(
        `
        *,
        patient:patient_id(full_name, email),
        practitioner:practitioner_id(full_name, contact_email)
      `,
        { count: "exact" }
      )
      .order(sort, { ascending: order === "asc" })
      .range(from, to);

    // Search support
    if (q) {
      query = query.or(`notes.ilike.%${q}%, telehealth_url.ilike.%${q}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("DB Error:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      total: count,
      per_page: perPage,
      page,
      data,
    });
  } catch (error: any) {
    console.error("❌ Appointments Fetch Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // 1️⃣ Auth check
    const {user} = await requireUser();
    console.log("User creating appointment:", user);
    // const isAdmin = user?.role === "admin" || user?.role === "super_admin";

    // if (!isAdmin) {
    //   return NextResponse.json(
    //     { error: "Unauthorized" },
    //     { status: 401 }
    //   );
    // }

    // 2️⃣ Parse body
    const {
      patient_id,
      practitioner_id,
      appointment_type_id,
      starts_at,
      ends_at,
      fee,
      currency,
    } = await req.json();

    if (
      !patient_id ||
      !practitioner_id ||
      !appointment_type_id ||
      !starts_at ||
      !ends_at
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 3️⃣ Expiry = 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 4️⃣ Insert appointment
    const { data, error } = await supabaseAdmin
      .from("appointments")
      .insert({
        patient_id,
        practitioner_id,
        appointment_type_id,
        starts_at,
        ends_at,
        status: "pending",
        payment_status: "pending",
        expires_at: expiresAt.toISOString(),
        fee_charged: fee,
        currency: currency || "INR",
        source: "admin",
        created_by_admin_id: user?.admin?.id || user?.auth_user_id, // 🔥 THIS LINE
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Failed to create appointment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      appointment: data,
      status: 201,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
