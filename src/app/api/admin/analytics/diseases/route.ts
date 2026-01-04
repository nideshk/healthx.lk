// app/api/admin/analytics/diseases/route.ts
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";


export async function GET(req: Request) {
  try {
 
    const { searchParams } = new URL(req.url);

    const country = searchParams.get("country") || "LK";
    const province = searchParams.get("province");
    const district = searchParams.get("district");
    const category = searchParams.get("category");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const groupBy = searchParams.get("groupBy") || "district";

    /* ---------------------------------------
       3️⃣ Build safe query
    --------------------------------------- */
    let query = supabaseAdmin
      .from("platform_disease_analytics")
      .select("*")
      .eq("country_code", country);

    if (province) query = query.eq("province", province);
    if (district) query = query.eq("district", district);
    if (category) query = query.eq("category_code", category);
    if (from) query = query.gte("day", from);
    if (to) query = query.lte("day", to);

    const { data, error } = await query;

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    /* ---------------------------------------
       4️⃣ Grouping logic (server-side)
    --------------------------------------- */
    const grouped: Record<string, number> = {};

    for (const row of data || []) {
      const key =
        groupBy === "province"
          ? row.province
          : groupBy === "day"
          ? row.day
          : row.district;

      if (!key) continue;

      grouped[key] = (grouped[key] || 0) + row.total_cases;
    }

    /* ---------------------------------------
       5️⃣ Response
    --------------------------------------- */
    return NextResponse.json({
      meta: {
        country,
        province,
        district,
        category,
        from,
        to,
        groupBy
      },
      data: Object.entries(grouped).map(([key, value]) => ({
        key,
        total_cases: value
      }))
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
