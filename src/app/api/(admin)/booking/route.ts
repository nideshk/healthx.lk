import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";

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
