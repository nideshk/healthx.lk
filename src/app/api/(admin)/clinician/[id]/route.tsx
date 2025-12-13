import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ⬅️ THIS is required for your typed routes setup
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing practitioner ID" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const specialization = searchParams.get("specialization");

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

    return NextResponse.json(
      {
        message: "Practitioner retrieved successfully",
        data: data[0],
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
