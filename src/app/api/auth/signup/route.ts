import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: Request) {
  console.log("▶️ Starting unified signup flow...");

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies});

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const apiKey = process.env.CLINIKO_API_KEY!;
  const region = process.env.CLINIKO_REGION || "au4";
  const userAgent = `${process.env.CLINIKO_APP_NAME || "Medx"} (${
    process.env.CLINIKO_APP_EMAIL || "admin@medx.app"
  })`;
  const authHeader = "Basic " + Buffer.from(apiKey + ":").toString("base64");

  try {
    const {
      email,
      password,
      first_name,
      last_name,
      fullName,
      dob,
      gender,
      phone,
      address_1,
      city,
      state,
      post_code,
      country_code = "LK",
    } = await req.json();

    console.log("📥 Incoming signup request:", { email, fullName });

    // ✅ 1️⃣ Create Supabase Auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) throw new Error("Supabase signup failed: " + error.message);
    const user = data.user;
    if (!user) throw new Error("Supabase returned no user");

    console.log("✅ Auth user created:", user.id);

    // ✅ 2️⃣ Create profile (skip if exists)
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!existingProfile) {
      const { error: profileError } = await supabaseAdmin.from("profiles").insert({
        id: user.id,
        display_name: fullName,
        role: "patient",
      });
      if (profileError) throw new Error("Profile insert failed: " + profileError.message);
      console.log("✅ Profile created:", user.id);
    } else {
      console.log("ℹ️ Profile already exists");
    }

    // ✅ 3️⃣ Create Cliniko patient
    

      const payload = {
      first_name: first_name,
      last_name: last_name,
 email: email?.toLowerCase(),     
  accepted_privacy_policy: true,
    };
     const res = await fetch(`https://api.${region}.cliniko.com/v1/patients`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": userAgent,
      },
      body: JSON.stringify(payload),
    });
   

    const text = await res.text();
    console.log("📡 Cliniko Response Status:", res.status);
    console.log("📡 Cliniko Response OK:", res.ok);
    console.log("📡 Cliniko Response Body:", text);

    if (!res.ok) {
      throw new Error(`Cliniko API failed (${res.status}): ${text || "No response body"}`);
    }

    let cliniko_patient_id: string | null = null;
    try {
      const clinikoJson = JSON.parse(text);
      cliniko_patient_id = clinikoJson?.id ?? null;
    } catch {
      throw new Error("Cliniko returned non-JSON response");
    }

    if (!cliniko_patient_id) {
      throw new Error("Cliniko did not return a valid patient ID");
    }

    console.log("✅ Cliniko patient created:", cliniko_patient_id);

    // ✅ 4️⃣ Mirror locally
    const { error: patientError } = await supabaseAdmin.from("patients").upsert({
      supabase_user_id: user.id,
      cliniko_patient_id,
      full_name: first_name + " " + last_name,
      email,
      dob,
      gender,
      contact_number: phone,
      address: [address_1, city, state, post_code].filter(Boolean).join(", "),
    });

    if (patientError) throw new Error("Supabase insert failed: " + patientError.message);

    console.log("✅ Patient mirrored in Supabase");

    // ✅ 5️⃣ Respond success
    return NextResponse.json({
      message: "Signup successful",
      user_id: user.id,
      cliniko_patient_id,
    });
  } catch (err: any) {
    console.error("❌ Fatal error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
