import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { supabaseClient } from "@/lib/supabaseClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      email,
      password,
      full_name,
      qualification,
      specialization,
      license_number,
      experience_years,
      contact_email,
      contact_number,
      profile_bio,
      fees,
      available_services,
      profile_picture_url,
      availability,
      bank_details
    } = body;

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 2️⃣ Create Auth user
    const { data, error: authErr } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { full_name },
      },
    });

    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 400 });
    }

    const user = data.user;
    if (!user) {
      return NextResponse.json(
        { error: "User creation failed" },
        { status: 500 }
      );
    }

    // 3️⃣ Create profile (role: practitioner)
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: user.id,
        display_name: full_name,
        role: "practitioner",
      });

    if (profileErr) {
      return NextResponse.json(
        { error: "Profile creation failed" },
        { status: 500 }
      );
    }

    // 4️⃣ Insert practitioner record
    const { data: practitionerRow, error: practitionerErr } =
      await supabaseAdmin
        .from("practitioners")
        .insert({
          supabase_user_id: user.id,
          full_name,
          qualification,
          specialization,
          license_number,
          experience_years,
          contact_email,
          contact_number,
          profile_bio,
          available_services,
          fees,
          profile_picture_url,
        })
        .select("id")
        .single();

    if (practitionerErr) {
      return NextResponse.json(
        { error: "Practitioner creation failed" },
        { status: 500 }
      );
    }

    const practitioner_id = practitionerRow.id;

    if (bank_details) {
      const { error: bankErr } = await supabaseAdmin
        .from("practitioner_bank_details")
        .insert({
          practitioner_id,
          account_holder_name: bank_details.account_name,
          bank_name: bank_details.bank_name,
          account_number: bank_details.account_number,
          branch_name: bank_details.branch_location ?? null,
          branch_address: bank_details.branch_address ?? null, // ✅
          ifsc_code: bank_details.ifsc_code ?? null,
          swift_code: bank_details.swift_code ?? null,
          is_default: true, 
        });

      if (bankErr) {
        return NextResponse.json(
          { error:  bankErr },
          { status: 500 }
        );
      }
    }

    // 5️⃣ Insert availability
    if (availability) {
      // Convert "09:00" -> ISO timestamp (using dummy date: 2000-01-01)
      const buildTimeStamp = (time: string) =>
        new Date(`2000-01-01T${time}:00`).toISOString();

      const starts_at = buildTimeStamp(availability.start_time);
      const ends_at = buildTimeStamp(availability.end_time);

      const { error: availErr } = await supabaseAdmin
        .from("practitioner_availability")
        .insert({
          practitioner_id,
          starts_at,
          ends_at,
          days_unavailable: availability.days_unavailable || [],
          timezone: availability.timezone || "Asia/Kolkata",
        });

      if (availErr) {
        return NextResponse.json(
          { error: "Availability creation failed" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      message: "Practitioner registered successfully",
      user_id: user.id,
      practitioner_id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
