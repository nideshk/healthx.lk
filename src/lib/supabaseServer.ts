import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export async function createServerSupabaseClient() {
  return createServerComponentClient({ cookies });
}
