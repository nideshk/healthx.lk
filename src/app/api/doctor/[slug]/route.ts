import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

const PUBLIC_DOCTOR_COLUMNS = `
  id,
  slug,
  full_name,
  specialization,
  profile_bio,
  qualification,
  languages,
  experience_years,
  profile_picture_url
`;

export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        const { data: practitioner, error } = await supabaseAdmin
            .from("practitioners")
            .select(PUBLIC_DOCTOR_COLUMNS)
            .eq("slug", slug)
            .eq("is_active", true)
            .is("deleted_at", null)
            .single();

        if (error || !practitioner) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Practitioner not found",
                },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                practitioner: {
                    id: practitioner.id,
                    slug: practitioner.slug,
                    full_name: practitioner.full_name,
                    specialization: practitioner.specialization,
                    profile_bio: practitioner.profile_bio,
                    qualification: practitioner.qualification,
                    qualifications: practitioner.qualification,
                    languages: practitioner.languages ?? [],
                    experience_years: practitioner.experience_years,
                    profile_picture_url: practitioner.profile_picture_url,
                    profile_image: practitioner.profile_picture_url,
                },
            },
            {
                headers: {
                    "Cache-Control":
                        "public, s-maxage=60, stale-while-revalidate=300",
                },
            }
        );
    } catch (err) {
        console.error("Practitioner slug API error:", err);

        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
            },
            { status: 500 }
        );
    }
}
