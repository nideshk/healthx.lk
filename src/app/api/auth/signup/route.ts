import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      date_of_birth,
      gender_identity,
      phone,
      emergency_contact,

      address,
      city,
      state_province,
      country,
      pin_code,

      government_id_type,
      government_id_number,
    } = await req.json();

    /* ───────────────────────────────
       1️⃣ Create Supabase Auth User
    ─────────────────────────────── */
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name,
          last_name,
        },
      },
    });

    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Auth user not returned");

    const user = data.user;

    /* ───────────────────────────────
       2️⃣ Create Profile (IDENTITY)
    ─────────────────────────────── */
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: user.id,
        role: "patient",
        first_name,
        last_name,
        city,
        state: state_province,
        country: country || "Sri Lanka",
      });

    if (profileError) {
      throw new Error("Profile insert failed: " + profileError.message);
    }

    /* ───────────────────────────────
       3️⃣ Create Patient Record
    ─────────────────────────────── */
    const { error: patientError } = await supabaseAdmin
      .from("patients")
      .insert({
        supabase_user_id: user.id,
        full_name: `${first_name} ${last_name}`, // ✅ still OK for medical records
        email,
        dob: date_of_birth,
        gender: gender_identity,
        contact_number: phone,
        emergency_contact,
        address,
        notes: pin_code ? `PIN: ${pin_code}` : null,
      });

    if (patientError) {
      throw new Error("Patient insert failed: " + patientError.message);
    }

    /* ───────────────────────────────
       4️⃣ Store Government ID
       ⚠️ Encrypt in production
    ─────────────────────────────── */
    if (government_id_type && government_id_number) {
      const encryptedId = government_id_number; // TODO: encrypt

      const { error: govIdError } = await supabaseAdmin
        .from("user_government_ids")
        .insert({
          user_id: user.id,
          id_type: government_id_type,
          id_number_encrypted: encryptedId,
          issued_country: "Sri Lanka",
        });

      if (govIdError) {
        throw new Error("Govt ID insert failed: " + govIdError.message);
      }
    }

    return NextResponse.json({
      message: "Signup successful",
      user_id: user.id,
    });
  } catch (err: any) {
    console.error("❌ Signup error:", err.message);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
