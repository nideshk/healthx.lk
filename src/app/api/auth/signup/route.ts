import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  console.log("▶️ Starting unified signup flow (NO CLINIKO)...");



  try {
    const {
      email,
      password,
      first_name,
      last_name,
      dob,
      gender,
      phone,
      address_1,
      city,
      state,
      post_code
    } = await req.json();

    console.log("📥 Incoming signup request:", { email, first_name });

    // --------------------------------------------------------------------
    // 1️⃣ Create Supabase Auth user
    // --------------------------------------------------------------------
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { full_name: first_name + " " + last_name } }
    });

    if (error) throw new Error("Supabase signup failed: " + error.message);
    if (!data.user) throw new Error("Supabase returned no user");

    const user = data.user;
    console.log("✅ Auth user created:", user.id);

    // --------------------------------------------------------------------
    // 2️⃣ Create profile (role: patient)
    // --------------------------------------------------------------------
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!existingProfile) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: user.id,
          display_name: first_name + " " + last_name,
          role: "patient"
        });

      if (profileError) throw new Error("Profile insert failed: " + profileError.message);

      console.log("✅ Profile created:", user.id);
    } else {
      console.log("ℹ️ Profile already exists");
    }

    // --------------------------------------------------------------------
    // 3️⃣ Insert patient into local patients table
    // --------------------------------------------------------------------
    const fullAddress = [address_1, city, state, post_code]
      .filter(Boolean)
      .join(", ");

    const { error: patientError } = await supabaseAdmin.from("patients").upsert({
      supabase_user_id: user.id,
      full_name: first_name + " " + last_name,
      email,
      dob,
      gender,
      contact_number: phone,
      address: fullAddress
    });

    if (patientError)
      throw new Error("Supabase patient insert failed: " + patientError.message);

    console.log("✅ Patient stored in Supabase");

    // --------------------------------------------------------------------
    // 4️⃣ Respond success
    // --------------------------------------------------------------------
    return NextResponse.json({
      message: "Signup successful",
      user_id: user.id
    });
  } catch (err: any) {
    console.error("❌ Fatal error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
