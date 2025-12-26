import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabaseAdmin";

async function getSupabase() {
  const cookieStore = await cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
}
export async function requireUser() {
  const supabase = await getSupabase();

  // 1) Auth user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      authorized: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const auth_user_id = user.id;

  // 2) Fetch profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", auth_user_id)
    .single();

  if (!profile) {
    return {
      authorized: false,
      response: Response.json({ error: "Profile not found" }, { status: 403 }),
    };
  }

  // 3) map patient row
  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select("id, contact_number")
    .eq("supabase_user_id", auth_user_id)
    .maybeSingle();

  // 4) map practitioner row
  const { data: practitioner } = await supabaseAdmin
    .from("practitioners")
    .select("id")
    .eq("supabase_user_id", auth_user_id)
    .maybeSingle();

  const { data: adminUser} = await supabaseAdmin
    .from("admin_users")
    .select("id, role")
    .eq("supabase_user_id", auth_user_id)
    .maybeSingle();

  let admin = null;

  if (adminUser) {
    // 6️⃣ admin policies
    const { data: policyRows } = await supabaseAdmin
      .from("admin_policy_map")
      .select("policy_code")
      .eq("admin_id", adminUser.id);

    admin = {
      id: adminUser.id,
      role: adminUser.role, // "admin" | "superadmin"
      policies: policyRows?.map(p => p.policy_code) ?? [],
    };
  }

  // 5) final unified user
  const sessionUser = {
    auth_user_id,       
    phone : patient.contact_number,             // ALWAYS THE AUTH ID
    role: profile.role,              // patient/practitioner/admin
    profile,
    user,
    admin,
    patient_id: patient?.id || null,
    practitioner_id: practitioner?.id || null,
    patient_data : {
      city : profile?.city,
      country : profile?.country,
      state : profile?.state,
      address : profile?.city+", "+profile?.state + ", " + profile?.country
    }
  };

  return {
    authorized: true,
    user: sessionUser,
    role: sessionUser.role,
    supabase,
  };
}
