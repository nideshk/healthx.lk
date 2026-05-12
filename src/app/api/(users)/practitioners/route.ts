
import { NextRequest, NextResponse } from "next/server";

import { supabaseClient } from "@/lib/supabaseClient";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

interface PractitionerPayload {
  full_name: string;
  qualification?: string;
  specialization?: string;
  license_number?: string;
  experience_years?: number;
  contact_email: string;
  contact_number?: string;
  profile_bio?: string;
  available_services?: string[];
  solo_consultation_fee?: number;
  family_consultation_fee?: number;
  bank_name?: string;
  account_name?: string;
  branch_location?: string;
  account_number?: string;
  profile_picture_url?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: PractitionerPayload = await req.json();

    if (!body.full_name || !body.contact_email) {
      return NextResponse.json(
        { error: "Missing required fields: full_name or contact_email" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseClient
      .from("practitioners")
      .insert([body])
      .select()
      .single();

    if (error) {
      console.error("Supabase Insert Error:", error);
      return NextResponse.json(
        { error: "Failed to add practitioner", details: error.message },
        { status: 500 }
      );
    }

      const cnx = getAuditContext(req);

    await auditLog({
      ...cnx,
      action: "VIEWED",
      entityType: "PRACTITIONER",
      purpose: "operations",
      source: "dashboard",
      metadata: { message: "Practitioner created successfully", data },
    })

    return NextResponse.json(
      { message: "Practitioner created successfully", data },
      { status: 201 }
    );
  } catch (err) {
    console.error("Unexpected Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(err) },
      { status: 500 }
    );
  }
}


export const dynamic = "force-dynamic"; // Ensures dynamic execution (no caching)

export async function GET(req: Request) {
  try {
  

    // ✅ Optional query filters for flexibility
    const { searchParams } = new URL(req.url);
    const specialization = searchParams.get("specialization");
    const limit = Number(searchParams.get("limit") ?? 50);
    const offset = Number(searchParams.get("offset") ?? 0);

    // ✅ Build query
    let query = supabaseClient
      .from("practitioners")
      .select(`
        id,
        full_name,
        specialization,
        qualification,
        license_number,
        experience_years,
        profile_bio,
        profile_picture_url,
        available_services,
        solo_consultation_fee,
        family_consultation_fee
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (specialization) {
      query = query.ilike("specialization", `%${specialization}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Supabase Fetch Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch practitioners", details: error.message },
        { status: 500 }
      );
    }

    // ✅ Handle empty data gracefully
    if (!data || data.length === 0) {
      return NextResponse.json(
        { message: "No practitioners found", data: [] },
        { status: 200 }
      );
    }

    // ✅ Clean success response
    return NextResponse.json(
      {
        message: "Practitioners retrieved successfully",
        count: data.length,
        data,
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

