import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { encrypt } from "@/lib/crypto";
import { practitionerApiSchema } from "@/lib/validation/practitioner";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1️⃣ Validate with Zod
    const result = practitionerApiSchema.safeParse(body);
    
    if (!result.success) {
      console.error("Practitioner Registration Validation Error:", result.error.format());
      return NextResponse.json(
        {
          success: false,
          errors: result.error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const {
      email,
      password,
      first_name,
      last_name,
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
      languages
    } = result.data;

    // 🔐 Encrypt password
    const encrypted_password = encrypt(password);

    const normalizedLanguages = languages
      .map((l: string) => l.trim())
      .filter(Boolean);

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
      console.error("Supabase Insertion Error (Practitioner Application):", error);
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
    console.error("Unexpected Practitioner Registration Error:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
