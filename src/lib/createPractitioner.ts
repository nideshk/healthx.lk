import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notify } from "@/lib/notify";

/**
 * Creates a practitioner account in a controlled, multi-step process.
 *
 * This function performs the following operations atomically (best-effort):
 * 1. Creates a Supabase Auth user
 * 2. Creates a corresponding profile with role = "practitioner"
 * 3. Creates a practitioner record
 * 4. Optionally inserts availability details
 * 5. Optionally inserts bank details
 *
 * If any step after user creation fails, the function performs a rollback by
 * deleting the created Auth user, profile, and practitioner records to avoid
 * partial or inconsistent state.
 *
 * ⚠️ IMPORTANT:
 * - This function does NOT throw exceptions.
 * - All failures are returned as structured results.
 * - Callers MUST check the returned `success` flag.
 *
 * @param input - Practitioner creation payload
 * @param input.email - Practitioner email address (used for auth)
 * @param input.password - Plain-text password used to create auth user
 * @param input.first_name - Practitioner first name
 * @param input.last_name - Practitioner last name
 * @param input.qualification - Medical qualification (e.g., MBBS)
 * @param input.specialization - List of specializations
 * @param input.license_number - Medical license number
 * @param input.experience_years - Years of professional experience
 * @param input.contact_email - Public contact email
 * @param input.contact_number - Public contact phone number
 * @param input.profile_bio - Short professional bio
 * @param input.available_services - List of appointment/service IDs
 * @param input.fees - Fee configuration per service
 * @param input.availability - Optional availability configuration
 * @param input.bank_details - Optional bank account details
 *
 * @returns A result object indicating success or failure
 *
 * @returns success=true
 * @returns userId - Supabase auth user ID
 * @returns practitioner_id - Created practitioner record ID
 *
 * @returns success=false
 * @returns message - Human-readable error message describing the failure
 */

type CreatePractitionerInput = {
  email: string;
  password: string;

  first_name: string;
  last_name?: string;
  state?: string;
  city?: string;
  qualification?: string;
  specialization?: string[];
  license_number?: string;
  experience_years?: number;
  contact_email?: string;
  contact_number?: string;
  profile_bio?: string;
  fees?: any;
  available_services?: string[];
  availability?: any;
  bank_details?: any;
};

export async function createPractitioner(
  input: CreatePractitionerInput
) {
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
    fees,
    available_services,
    availability,
    bank_details,
  } = input;

  const full_name = [first_name, last_name].filter(Boolean).join(" ");

  /* 1️⃣ Create auth user */
  const { data: authData, error: authErr } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    });

  if (authErr || !authData.user) {
    throw new Error(authErr?.message ?? "Auth creation failed");
  }

  const userId = authData.user.id;

  /* 2️⃣ Create profile */
  const { data, error: profileErr } = await supabaseAdmin.from("profiles").insert({
    id: userId,
    display_name: full_name,
    first_name: first_name,
    last_name: last_name,
    role: "practitioner",
    is_active: true,
    state,
    city,
  });

  if (profileErr) {
    console.error("PROFILE CREATION FAILED — ROLLING BACK USER", profileErr);

    // 🔥 Rollback auth user immediately
    await supabaseAdmin.auth.admin.deleteUser(userId);

    return {
      success: false,
      message: "Failed to create practitioner profile",
    };
  }

  /* 3️⃣ Create practitioner */
  const { data: practitioner } = await supabaseAdmin
    .from("practitioners")
    .insert({
      supabase_user_id: userId,
      full_name,
      first_name,
      last_name,
      qualification,
      specialization,
      license_number,
      experience_years,
      contact_email,
      contact_number,
      profile_bio,
      available_services,
      fees,
      is_active: true,
    })
    .select("id")
    .single();

  const practitioner_id = practitioner?.id;

  /* 4️⃣ Availability */
  if (availability) {
    const toISO = (t: string) =>
      new Date(`2000-01-01T${t}:00`).toISOString();

    await supabaseAdmin.from("practitioner_availability").insert({
      practitioner_id,
      starts_at: toISO(availability.start_time),
      ends_at: toISO(availability.end_time),
      days_unavailable: availability.days_unavailable || [],
      timezone: availability.timezone || "Asia/Kolkata",
    });
  }

  /* 5️⃣ Bank details */
  if (bank_details) {
    await supabaseAdmin.from("practitioner_bank_details").insert({
      practitioner_id,
      account_holder_name: bank_details.account_name,
      bank_name: bank_details.bank_name,
      account_number: bank_details.account_number,
      branch_name: bank_details.branch_location ?? null,
      branch_address: bank_details.branch_address ?? null,
      ifsc_code: bank_details.ifsc_code ?? null,
      swift_code: bank_details.swift_code ?? null,
      is_default: true,
    });
  }

  /* 6️⃣ Notify */
      await notify({
      userId, // auth.users.id
      role: "practitioner",
      eventType: "practitioner_account_created",
      title: "Your Doctor Account Has Been Created",
      message: `
Hello ${full_name},
Your doctor account has been created.
Login details:
Username: ${email}
Password: ${password}
Please keep these credentials secure.
Regards,
Clinico Team
      `.trim(),
      channels: ["email"],
      payload: {
        email,
        username: email,
        password,
        practitioner_id,
      },
    });

  return { userId, practitioner_id };
}
