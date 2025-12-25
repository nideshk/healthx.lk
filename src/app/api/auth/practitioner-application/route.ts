import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { encrypt } from "@/lib/crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      email,
      password,
      first_name,
      last_name,
      state,   // ✅ NEW
      city,  
      qualification,
      specialization,
      license_number,
      experience_years,
      contact_email,
      contact_number,
      profile_bio,
      available_services,
      fees,
      availability,
      bank_details,
    } = body;

    // 🔴 Required fields
    if (!email || !password || !first_name) {
      return NextResponse.json(
        {
          success: false,
          message: "Email, password and first_name are required",
        },
        { status: 400 }
      );
    }

    // 🔐 Encrypt password
    const encrypted_password = encrypt(password);

    // ✅ Insert application
    const { error } = await supabaseAdmin
      .from("practitioner_applications")
      .insert({
        email,
        first_name,
        last_name,
        encrypted_password,
        state,
        city,
        qualification,
        specialization,
        license_number,
        experience_years,
        contact_email,
        contact_number,
        profile_bio,

        available_services,
        fees,
        availability,
        bank_details,

        status: "pending",
        user_created: false,
      });

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
