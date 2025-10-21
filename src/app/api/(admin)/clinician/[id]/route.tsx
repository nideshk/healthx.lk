import { supabaseClient } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id) {
      return NextResponse.json(
        { error: "Missing practitioner ID" },
        { status: 400 }
      );
    }

    // Optional query filters for flexibility
    const { searchParams } = new URL(req.url);
    const specialization = searchParams.get("specialization");

    // Build query
    let query = supabaseClient
      .from("practitioners")
      .select("*")
      .eq("id", id)
      .limit(1)
      .order("created_at", { ascending: false });

    if (specialization) {
      query = query.ilike("specialization", `%${specialization}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Supabase Fetch Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch practitioner", details: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { message: "Practitioner not found", data: [] },
        { status: 404 }
      );
    }

    // ✅ Clean success response
    return NextResponse.json(
      {
        message: "Practitioner retrieved successfully",
        data: data[0],
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("❌ Unexpected Server Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(err) },
      { status: 500 }
    );
  }
}
