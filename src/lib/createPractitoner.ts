import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notify } from "@/lib/notify";

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
  await supabaseAdmin.from("profiles").insert({
    id: userId,
    display_name: full_name,
    first_name: first_name,
    last_name: last_name,
    role: "practitioner",
    is_active: true,
    state,
    city,
  });

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
