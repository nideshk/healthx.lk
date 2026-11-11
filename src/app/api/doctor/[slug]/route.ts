import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isPractitionerId } from "@/lib/practitionerPath";
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

async function findPractitioner(key: string) {
  const bySlug = await supabaseAdmin
    .from("practitioners")
    .select(PUBLIC_DOCTOR_COLUMNS)
    .eq("slug", key)
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (bySlug.error) return { data: null, error: bySlug.error };
  if (bySlug.data) return { data: bySlug.data, error: null };
  if (!isPractitionerId(key)) return { data: null, error: null };

  const byId = await supabaseAdmin
    .from("practitioners")
    .select(PUBLIC_DOCTOR_COLUMNS)
    .eq("id", key)
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();

  return { data: byId.data, error: byId.error };
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const key = decodeURIComponent(slug || "").trim();

        if (!key) {
            return NextResponse.json(
                { success: false, error: "Practitioner not found" },
                { status: 404 }
            );
        }

        const { data: practitioner, error } = await findPractitioner(key);

        if (error) {
            console.error("Practitioner lookup failed");
            return NextResponse.json(
                { success: false, error: "Internal server error" },
                { status: 500 }
            );
        }

        if (!practitioner) {
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
