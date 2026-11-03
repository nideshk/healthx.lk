import { supabaseClient } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    // 🧩 Build Supabase query
    let query = supabaseClient
      .from("services")
      .select("*")
      .order("created_at", { ascending: false });

    // Optionally exclude inactive
    if (!includeInactive) query = query.eq("active", true);

    const { data, error } = await query;

    if (error) {
      console.error("❌ Supabase query error:", error.message);
      return NextResponse.json(
        { success: false, message: "Database query failed", error: error.message },
        { status: 500 }
      );
    }
    // Public specialty catalog changes rarely. Inactive-inclusive admin
    // reads stay uncached. Availability is not part of this payload.
    const cacheControl =
      includeInactive
        ? "private, no-store"
        : "public, max-age=120, s-maxage=300, stale-while-revalidate=900";

    return NextResponse.json(
      {
        success: true,
        count: data?.length || 0,
        services: data,
      },
      {
        headers: {
          "Cache-Control": cacheControl,
        },
      }
    );
  } catch (err: any) {
    console.error("❌ Unexpected Server Error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
        error: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
