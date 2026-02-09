import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let createdUserId: string | null = null;

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
      marketing_consent = false,
      government_id_type,
      government_id_number,
    } = await req.json();

    /* ───────────────────────────────
       0️⃣ Validation
    ─────────────────────────────── */
    if (!email || !password || !first_name || !last_name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    /* ───────────────────────────────
       1️⃣ Create Auth User (EMAIL VERIFICATION ON)
    ─────────────────────────────── */
    const { data, error } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // ✅ keep normal Supabase verification
        user_metadata: {
          first_name,
          last_name,
          role: "patient",
        },
      });

    if (error) {
      if (error.message.includes("already registered")) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 409 }
        );
      }
      throw error;
    }

    if (!data.user) throw new Error("Auth user not created");

    createdUserId = data.user.id;

    /* ───────────────────────────────
       2️⃣ Profile
    ─────────────────────────────── */
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: createdUserId,
        role: "patient",
        first_name,
        last_name,
        city,
        state: state_province,
        country: country || "Sri Lanka",
      });

    if (profileError) {
      throw new Error(profileError.message);
    }

    /* ───────────────────────────────
       3️⃣ Patient Record
    ─────────────────────────────── */
    const { error: patientError } = await supabaseAdmin
      .from("patients")
      .insert({
        supabase_user_id: createdUserId,
        full_name: `${first_name} ${last_name}`,
        email,
        dob: date_of_birth,
        gender: gender_identity,
        contact_number: phone,
        emergency_contact,
        address,
        marketing_consent,
      });

    if (patientError) {
      throw new Error(patientError.message);
    }

    /* ───────────────────────────────
       4️⃣ Government ID (optional)
    ─────────────────────────────── */
    if (government_id_type && government_id_number) {
      const encryptedId = government_id_number; // 🔐 encrypt later

      const { error: govIdError } = await supabaseAdmin
        .from("user_government_ids")
        .insert({
          user_id: createdUserId,
          id_type: government_id_type,
          id_number_encrypted: encryptedId,
          issued_country: "Sri Lanka",
        });

      if (govIdError) {
        throw new Error(govIdError.message);
      }
    }

    /* ───────────────────────────────
       5️⃣ Success
    ─────────────────────────────── */
    return NextResponse.json(
      {
        message:
          "Account created successfully. Please check your email to verify your account.",
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("❌ Signup error:", err.message);

    /* Rollback */
    if (createdUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
    }

    return NextResponse.json(
      { error: err.message || "Signup failed" },
      { status: 500 }
    );
  }
}
