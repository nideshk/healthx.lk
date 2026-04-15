import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeFeesToArray(
  fees: any
): { code: string; label: string; amount: number }[] {
  if (!fees || typeof fees !== "object") return [];

  return Object.values<any>(fees)
    .filter(
      (f) =>
        f &&
        typeof f === "object" &&
        typeof f.type === "string" &&
        typeof f.fee === "number"
    )
    .map((f) => ({
      code: f.type
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, ""),
      label: f.type,
      amount: f.fee,
    }));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const limit = Math.min(Number(searchParams.get("limit") || 10), 50);
    const offset = Number(searchParams.get("offset") || 0);

    /* ------------------------------------------------
     * 🔐 Auth check (optional – may be guest)
     * ------------------------------------------------ */
    const authResult = await requireUser(req);
    const { user } = await requireUser(req);
    const isAdmin =
      authResult.authorized && authResult.role === "admin";

    /* =================================================
     * 🛡️ ADMIN FLOW
     * ================================================= */
    const cnx = getAuditContext(req, user);
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
            fees,
            languages
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
      const practitioners = rows.map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        qualification: p.qualification,
        specialization: p.specialization,
        license_number: p.license_number,
        profile_picture_url: p.profile_picture_url,
        experience_years: p.experience_years,
        is_active: p.is_active,
        languages: p.languages ?? [],
        // ✅ OPTION 1 FEES STRUCTURE
        fees: normalizeFeesToArray(p.fees),
      }));

      await auditLog({
        ...cnx,
        action: "VIEWED",
        entityType: "PRACTITIONER",
        purpose: "operations",
        metadata: {
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
        }
      })

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
        profile_picture_url,
        avg_rating,
        review_count,
        languages
      `)
      .eq("is_active", true)

    if (specialization) {
      query = query.contains("specialization", [specialization]);
    }

    const { data, error } = await query;
    console.log(data)
    if (error) {
      console.error("❌ Supabase Fetch Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch practitioners" },
        { status: 500 }
      );
    }
    await auditLog({
      ...cnx,
      action: "VIEWED",
      entityType: "PRACTITIONER",
      purpose: "operations",
      metadata: {
        success: true,
        role: "guest",
        count: data?.length ?? 0,
        data: data ?? [],
      }
    })

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
