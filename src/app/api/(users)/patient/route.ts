import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { authorized, role } = await requireUser();

    if (!authorized) {
      return NextResponse.json(
        { error: "You are not authorized to access this resource." },
        { status: 401 }
      );
    }

    const allowedRoles = ["admin", "superadmin"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "You do not have permission to view patients." },
        { status: 403 }
      );
    }

    /** Query params */
    const { searchParams } = new URL(request.url);

    const page = Math.max(Number(searchParams.get("page") ?? 1), 1);
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

    const rawQ = searchParams.get("q")?.trim();
    const q = rawQ && rawQ.length >= 4 ? rawQ : null;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    /** Base query (explicit column selection) */
    let query = supabaseAdmin
      .from("patients")
      .select(
        `
          id,
          supabase_user_id,
          full_name,
          dob,
          gender,
          contact_number,
          email,
          address,
          emergency_contact
        `,
        { count: "exact" }
      )
      .eq("is_active", true)
      .is("deleted_at", null);

    /** Search ONLY if q >= 4 */
    if (q) {
      query = query.or(
        `full_name.ilike.%${q}%,email.ilike.%${q}%,contact_number.ilike.%${q}%`
      );
    }

    /** Pagination + ordering */
    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return NextResponse.json({
      data: data ?? [],
      meta: {
        page,
        limit,
        total: count ?? 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
        searchApplied: Boolean(q),
      },
    });
  } catch (err: any) {
    console.error("GET /patients error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unable to fetch patients." },
      { status: 500 }
    );
  }
}
