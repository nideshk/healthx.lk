import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const specialization = searchParams.get("specialization");
    const limit = Number(searchParams.get("limit") ?? 50);
    const offset = Number(searchParams.get("offset") ?? 0);

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
        count: data?.length ?? 0,
        data: data ?? [],
      },
      { status: 200 }
    );

  } catch (err) {
    console.error("❌ Unexpected Server Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
