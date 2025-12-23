import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const limit = Math.min(Number(searchParams.get("limit") || 10), 50);
    const offset = Number(searchParams.get("offset") || 0);

    /* ------------------------------------------------
     * 🔐 Auth check (optional – may be guest)
     * ------------------------------------------------ */
    const authResult = await requireUser();
    const isAdmin =
      authResult.authorized && authResult.role === "admin";

    /* =================================================
     * 🛡️ ADMIN FLOW
     * ================================================= */
    if (isAdmin) {
      const q = searchParams.get("q")?.trim() || "";

      let rows: any[] = [];
      let total = 0;

      // 🔍 SEARCH MODE (q >= 4)
      if (q.length >= 4) {
        const { data, error } = await supabaseAdmin.rpc(
          "search_practitioners",
          {
            search_text: q,
            lim: limit,
            off: offset,
          }
        );

        if (error) {
          return NextResponse.json(
            { error: "Failed to search practitioners", details: error.message },
            { status: 500 }
          );
        }

        rows = data ?? [];

        const { count } = await supabaseAdmin
          .from("practitioners")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .is("deleted_at", null);

        total = count ?? 0;
      }

      // 📦 NON-SEARCH MODE
      else {
        const { data, count, error } = await supabaseAdmin
          .from("practitioners")
          .select(
            `
            id,
            full_name,
            qualification,
            specialization,
            license_number,
            profile_picture_url,
            experience_years,
            is_active,
            fees
            `,
            { count: "exact" }
          )
          .eq("is_active", true)
          .is("deleted_at", null)
          .order("full_name", { ascending: true })
          .range(offset, offset + limit - 1);

        if (error) {
          return NextResponse.json(
            { error: "Failed to fetch practitioners", details: error.message },
            { status: 500 }
          );
        }

        rows = data ?? [];
        total = count ?? 0;
      }

      // 🔄 Normalize fees → { type: fee }
      const practitioners = rows.map((p: any) => {
        const fees: Record<string, number> = {};

        if (p.fees && typeof p.fees === "object") {
          for (const value of Object.values<any>(p.fees)) {
            if (
              value &&
              typeof value === "object" &&
              typeof value.type === "string" &&
              typeof value.fee === "number"
            ) {
              fees[value.type] = value.fee;
            }
          }
        }

        return {
          id: p.id,
          full_name: p.full_name,
          qualification: p.qualification,
          specialization: p.specialization,
          license_number: p.license_number,
          profile_picture_url: p.profile_picture_url,
          experience_years: p.experience_years,
          is_active: p.is_active,
          fees,
        };
      });

      return NextResponse.json({
        success: true,
        role: "admin",
        search_applied: q.length >= 4,
        query: q.length >= 4 ? q : null,
        pagination: {
          limit,
          offset,
          total,
        },
        practitioners,
      });
    }

    /* =================================================
     * 🌍 GUEST / PUBLIC FLOW
     * ================================================= */
    const specialization = searchParams.get("specialization");

    let query = supabaseClient
      .from("practitioners")
      .select(`
        id,
        full_name,
        specialization,
        profile_image,
        years_of_experience,
        avg_rating,
        review_count,
        city,
        consultation_modes,
        languages
      `)
      .eq("is_active", true)
      .eq("is_verified", true)
      .gte("avg_rating", 3.8)
      .order("avg_rating", { ascending: false })
      .range(offset, offset + limit - 1);

    if (specialization) {
      query = query.ilike("specialization", `%${specialization}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Supabase Fetch Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch practitioners" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        role: "guest",
        count: data?.length ?? 0,
        data: data ?? [],
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("❌ Practitioners API Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
