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
    const { data:patients, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    const patientUserIds = [
      ...new Set(
        (patients ?? [])
          .map((p: any) => p.supabase_user_id)
          .filter(Boolean)
      ),
    ];

    let profileMap: Record<string, any> = {};

    if (patientUserIds.length > 0) {
      const { data: profiles, error: profileErr } = await supabaseAdmin
        .from("profiles")
        .select("id, city, state, country")
        .in("id", patientUserIds);

      if (profileErr) {
        return NextResponse.json(
          { error: "Failed to fetch patient profiles" },
          { status: 500 }
        );
      }

      profileMap = Object.fromEntries(
        profiles.map((p: any) => [p.id, p])
      );
    }

    const enrichedPatients = (patients ?? []).map((p: any) => {
    const profile = profileMap[p.supabase_user_id] ?? {};

    return {
      ...p,
      city: profile.city ?? null,
      state: profile.state ?? null,
      country: profile.country ?? null,
    };
  });


    return NextResponse.json({
      data: enrichedPatients ?? [],
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
