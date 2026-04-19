import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.length < 2) {
        return NextResponse.json({ data: [] });
    }

    const { data: diagnoses, error } = await supabaseAdmin
        .from("diagnoses")
        .select("id, code, name, description, category")
        .or(`code.ilike.%${q}%,name.ilike.%${q}%`)
        .limit(30);

    if (error) {
        console.error("Diagnosis search error:", error.message);
        return NextResponse.json({ error: "Failed to search diagnoses" }, { status: 500 });
    }

    return NextResponse.json({ data: diagnoses });
}
