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
    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      services: data,
    });
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
