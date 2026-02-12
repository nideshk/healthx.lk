import { auditLog } from "@/lib/audit/auditLog";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { authorized, role, user } = await requireUser(request);
    const cnx = getAuditContext(request, user);

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

    /* -------------------------------------------------------
       Query Params
    ------------------------------------------------------- */
    const { searchParams } = new URL(request.url);

    const page = Math.max(Number(searchParams.get("page") ?? 1), 1);
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

    const rawQ = searchParams.get("q")?.trim();
    const q = rawQ && rawQ.length >= 1 ? rawQ : null;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    /* -------------------------------------------------------
       Base Query
    ------------------------------------------------------- */
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
          emergency_contact,
          allergies,
          created_at
        `,
        { count: "exact" }
      )
      .eq("is_active", true)
      .is("deleted_at", null);

    /* -------------------------------------------------------
       SEARCH LOGIC
       (name/email/phone + government ID)
    ------------------------------------------------------- */
    let matchedUserIds: string[] = [];

    if (q) {
      // 🔎 Search government ID table first
      const { data: govMatches, error: govErr } = await supabaseAdmin
        .from("user_government_ids")
        .select("user_id")
        .ilike("id_number_encrypted", `%${q}%`);

      if (govErr) throw govErr;

      matchedUserIds = govMatches?.map((g) => g.user_id) ?? [];

      // 🔎 Apply search filter
      if (matchedUserIds.length > 0) {
        query = query.or(
          `full_name.ilike.%${q}%,email.ilike.%${q}%,contact_number.ilike.%${q}%,supabase_user_id.in.(${matchedUserIds.join(",")})`
        );
      } else {
        query = query.or(
          `full_name.ilike.%${q}%,email.ilike.%${q}%,contact_number.ilike.%${q}%`
        );
      }
    }

    /* -------------------------------------------------------
       Pagination
    ------------------------------------------------------- */
    const { data: patients, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    /* -------------------------------------------------------
       Fetch Profiles (city/state/country)
    ------------------------------------------------------- */
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

      if (profileErr) throw profileErr;

      profileMap = Object.fromEntries(
        profiles.map((p: any) => [p.id, p])
      );
    }

    /* -------------------------------------------------------
       Fetch Government IDs for Display
    ------------------------------------------------------- */
    let govMap: Record<string, any> = {};
    if (patientUserIds.length > 0) {
      const { data: govIds, error: govFetchErr } = await supabaseAdmin
        .from("user_government_ids")
        .select("user_id, id_type, id_number_encrypted")
        .in("user_id", patientUserIds);

      if (govFetchErr) throw govFetchErr;

      govMap = Object.fromEntries(
        govIds.map((g: any) => [g.user_id, g])
      );
    }

    /* -------------------------------------------------------
       Final Enriched Response
    ------------------------------------------------------- */
    const enrichedPatients = (patients ?? []).map((p: any) => {
      const profile = profileMap[p.supabase_user_id] ?? {};
      const gov = govMap[p.supabase_user_id] ?? null;

      return {
        ...p,
        city: profile.city ?? null,
        state: profile.state ?? null,
        country: profile.country ?? null,
        government_id: gov
          ? {
              type: gov.id_type,
              number: gov.id_number_encrypted,
            }
          : null,
      };
    });

    /* -------------------------------------------------------
       Audit Log
    ------------------------------------------------------- */
    await auditLog({
      ...cnx,
      action: "VIEWED",
      entityType: "PATIENT",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        data_count: enrichedPatients.length,
        meta: {
          page,
          limit,
          total: count ?? 0,
          totalPages: count ? Math.ceil(count / limit) : 0,
          searchApplied: Boolean(q),
        },
      },
    });

    return NextResponse.json({
      data: enrichedPatients,
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
