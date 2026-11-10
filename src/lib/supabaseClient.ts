import { createClient } from "@supabase/supabase-js";
import { supabaseQueryAuth, supabaseQueryFetch } from "@/lib/supabaseQuery";

export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: supabaseQueryAuth,
    global: { fetch: supabaseQueryFetch },
  }
);