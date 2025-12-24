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

      address_1,
      city,
      state_province,
      country,
      pin_code,

      government_id_type,
      government_id_number,
    } = await req.json();

    console.log("📥 Incoming signup request:", { email });

    /* ─────────────────────────────────────────────
       1️⃣ Create Supabase Auth user
    ───────────────────────────────────────────── */
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: `${first_name} ${last_name}`,
        },
      },
    });

    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Auth user not returned");

    const user = data.user;
    console.log("✅ Auth user created:", user.id);

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: user.id,
        display_name: `${first_name} ${last_name}`,
        role: "patient",
        city,
        state: state_province,
        country: country || "Sri Lanka",
      });

    if (profileError)
      throw new Error("Profile insert failed: " + profileError.message);

    console.log("✅ Profile created");

    const { error: patientError } = await supabaseAdmin
      .from("patients")
      .insert({
        supabase_user_id: user.id,
        full_name: `${first_name} ${last_name}`,
        email,
        dob: date_of_birth,
        gender: gender_identity,
        contact_number: phone,
        address: address_1,
        notes: `City: ${city}, State: ${state_province}, PIN: ${pin_code}`,
      });

    if (patientError)
      throw new Error("Patient insert failed: " + patientError.message);

    console.log("✅ Patient created");

    /* ─────────────────────────────────────────────
       4️⃣ Store Government ID (SEPARATE TABLE)
       ⚠️ Encrypt before storing in production
    ───────────────────────────────────────────── */
    const encryptedId = government_id_number; // 🔐 replace with real encryption

    const { error: govIdError } = await supabaseAdmin
      .from("user_government_ids")
      .insert({
        user_id: user.id,
        id_type: government_id_type,
        id_number_encrypted: encryptedId,
        issued_country: "Sri Lanka",
      });

    if (govIdError)
      throw new Error("Govt ID insert failed: " + govIdError.message);

    console.log("✅ Government ID stored");

    /* ─────────────────────────────────────────────
       5️⃣ Success
    ───────────────────────────────────────────── */
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
