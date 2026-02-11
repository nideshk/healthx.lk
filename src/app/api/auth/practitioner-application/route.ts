import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { encrypt } from "@/lib/crypto";

function validateEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(pw: string) {
  const minLength = pw.length >= 8;
  const lower = /[a-z]/.test(pw);
  const upper = /[A-Z]/.test(pw);
  const number = /[0-9]/.test(pw);
  const special = /[!@#$%^&*(),.?":{}|<>]/.test(pw);

  if (!minLength) return "Password must be at least 8 characters";
  if (!lower) return "Password must contain a lowercase letter";
  if (!upper) return "Password must contain an uppercase letter";
  if (!number) return "Password must contain a number";
  if (!special) return "Password must contain a special character";

  return null;
}


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
      bank_details,
      languages
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

    /* Email format validation */
    if (!validateEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email format",
        },
        { status: 400 }
      );
    }

    /* Password strength validation */
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json(
        {
          success: false,
          message: passwordError,
        },
        { status: 400 }
      );
    }

    // 🔐 Encrypt password
    const encrypted_password = encrypt(password);

    let normalizedLanguages: string[] | null = null;

    if (languages !== undefined) {
      if (!Array.isArray(languages)) {
        return NextResponse.json(
          {
            success: false,
            message: "languages must be an array of strings",
          },
          { status: 400 }
        );
      }

      normalizedLanguages = languages
        .map((l: string) => l.trim())
        .filter(Boolean);
    }

    // ✅ Insert application
    const { data, error } = await supabaseAdmin
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
        bank_details,

        status: "pending",
        user_created: false,
        languages: normalizedLanguages
      })
      .select("id")
      .single();;

    if (error) {
      console.log("error", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully",
      application_id: data?.id,
    });
  } catch (err: any) {
    console.log(err)
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
