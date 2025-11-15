import { supabaseClient } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    // ⬅️ Required for typed routes
    const { slug } = await context.params;

    if (!slug) {
      return NextResponse.json(
        { success: false, message: "Specialisation slug is required" },
        { status: 400 }
      );
    }

    // 🧩 Query practitioners whose specialization array contains the slug
    const { data, error } = await supabaseClient
      .from("practitioners")
      .select("*")
      .contains("specialization", [slug])        // specialization = text[]
      .filter("cliniko_practitioner_id", "not.ilike", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Supabase query error:", error.message);
      return NextResponse.json(
        {
          success: false,
          message: "Database query failed",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      specialization: slug,
      practitioners: (data || []).map((p) => ({
        full_name: p.full_name,
        qualification: p.qualification,
        cliniko_practitioner_id: p.cliniko_practitioner_id,
        license_number: p.license_number,
        contact_email: p.contact_email,
        profile_picture_url: p.profile_picture_url,
        price: p.solo_consultation_fee,
      })),
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
