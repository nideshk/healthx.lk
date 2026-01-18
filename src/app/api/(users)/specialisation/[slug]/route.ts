import { supabaseClient } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";


function getAvatarUrl(
  profiles: { avatar_url?: string } | { avatar_url?: string }[] | null
): string | null {
  if (!profiles) return null;
  if (Array.isArray(profiles)) {
    return profiles[0]?.avatar_url ?? null;
  }
  return profiles.avatar_url ?? null;
}


export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    if (!slug) {
      return NextResponse.json(
        { success: false, message: "Specialisation slug is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseClient
      .from("practitioners")
      .select(`
    id,
    full_name,
    profile_bio,
    qualification,
    license_number,
    contact_email,
    fees,
    profiles!practitioners_profiles_fkey (
      avatar_url
    )
  `)
      .contains("specialization", [slug])
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

    console.log(data)
    function calculateAverageFee(
      fees?: Record<
        string,
        {
          fee?: number;
        }
      >
    ): number | null {
      if (!fees) return null;

      const validFees = Object.values(fees)
        .map(f => Number(f.fee))
        .filter(f => Number.isFinite(f) && f > 0);

      if (validFees.length === 0) return null;

      const avg =
        validFees.reduce((sum, f) => sum + f, 0) / validFees.length;

      return Math.round(avg);
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      specialization: slug,
      practitioners: (data || []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        profile_bio: p.profile_bio,
        qualification: p.qualification,
        license_number: p.license_number,
        contact_email: p.contact_email,
        profile_picture_url: getAvatarUrl(p.profiles),
        fees: calculateAverageFee(p.fees),
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
