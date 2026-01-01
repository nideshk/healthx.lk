import { supabaseAdmin } from "./supabaseAdmin";
import { supabaseServer } from "./supabaseServer";

export async function requireUser() {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  console.log("Auth Guard - Supabase User:", user);

  
  if (!user || error) {
    return {
      authorized: false,
      response: Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const auth_user_id = user.id;

  /* ---------------------------------------
     2️⃣ Fetch profile (admin client)
  --------------------------------------- */
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", auth_user_id)
    .single();

  if (!profile) {
    return {
      authorized: false,
      response: Response.json(
        { error: "Profile not found" },
        { status: 403 }
      ),
    };
  }

  /* ---------------------------------------
     3️⃣ Map patient row
  --------------------------------------- */
  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select("id, contact_number")
    .eq("supabase_user_id", auth_user_id)
    .maybeSingle();

  /* ---------------------------------------
     4️⃣ Map practitioner row
  --------------------------------------- */
  const { data: practitioner } = await supabaseAdmin
    .from("practitioners")
    .select("id")
    .eq("supabase_user_id", auth_user_id)
    .maybeSingle();

  /* ---------------------------------------
     5️⃣ Map admin + policies
  --------------------------------------- */
  const { data: adminUser } = await supabaseAdmin
    .from("admin_users")
    .select("id, role")
    .eq("supabase_user_id", auth_user_id)
    .maybeSingle();

  let admin = null;

  if (adminUser) {
    const { data: policyRows } = await supabaseAdmin
      .from("admin_policy_map")
      .select("policy_code")
      .eq("admin_id", adminUser.id);

    admin = {
      id: adminUser.id,
      role: adminUser.role,
      policies: policyRows?.map((p) => p.policy_code) ?? [],
    };
  }

  /* ---------------------------------------
     6️⃣ (OPTIONAL) Enforce MFA for admins
  --------------------------------------- */
  // if (
  //   admin &&
  //   !user.amr?.includes("mfa")
  // ) {
  //   return {
  //     authorized: false,
  //     response: Response.json(
  //       { error: "MFA required" },
  //       { status: 403 }
  //     ),
  //   };
  // }

  /* ---------------------------------------
     7️⃣ Unified session user
  --------------------------------------- */
  const sessionUser = {
    auth_user_id,
    role: profile.role,
    profile,
    user, // raw Supabase user
    admin,
    phone: patient?.contact_number || null,
    patient_id: patient?.id || null,
    practitioner_id: practitioner?.id || null,
    patient_data: {
      city: profile.city,
      state: profile.state,
      country: profile.country,
      address: `${profile.city}, ${profile.state}, ${profile.country}`,
    },
  };

  return {
    authorized: true,
    user: sessionUser,
    role: sessionUser.role,
  };
}
