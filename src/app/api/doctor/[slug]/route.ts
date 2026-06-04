import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        const { data: practitioner, error } = await supabaseAdmin
            .from("practitioners")
            .select("*")
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

        return NextResponse.json({
            success: true,
            practitioner,
        });
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