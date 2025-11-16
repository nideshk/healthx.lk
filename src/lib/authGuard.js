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
    .select("id")
    .eq("supabase_user_id", auth_user_id)
    .maybeSingle();

  // 4) map practitioner row
  const { data: practitioner } = await supabaseAdmin
    .from("practitioners")
    .select("id")
    .eq("supabase_user_id", auth_user_id)
    .maybeSingle();

  // 5) final unified user
  const sessionUser = {
    auth_user_id,                    // ALWAYS THE AUTH ID
    role: profile.role,              // patient/practitioner/admin
    profile,
    patient_id: patient?.id || null,
    practitioner_id: practitioner?.id || null,
  };

  return {
    authorized: true,
    user: sessionUser,
    role: sessionUser.role,
    supabase,
  };
}
