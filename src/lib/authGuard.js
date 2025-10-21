import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabaseAdmin";


async function getSupabase() {
  const cookieStore = await cookies(); 
  return createRouteHandlerClient({ cookies: () => cookieStore });
}

export async function requireUser() {
  const supabase = await getSupabase();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      authorized: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // ✅ Use supabaseAdmin to bypass RLS when reading profiles
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("patients")
    .select("*")
    .eq("supabase_user_id", user.id)
    .single();

  if (profileError || !profile) {
    return {
      authorized: false,
      response: Response.json(
        { error: "Profile not found" },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, user : {...user, ...profile}, role: profile.role, supabase };
}

/**
 * Enforce that the logged-in Supabase user has an admin role.
 */
export async function requireAdmin() {
  const { authorized, response, user, role } = await requireUser();

  if (!authorized) return { authorized, response };

  if (role !== "admin") {
    return {
      authorized: false,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { authorized: true, user, role };
}
