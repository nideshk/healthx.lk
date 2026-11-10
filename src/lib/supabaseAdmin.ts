import { createClient } from "@supabase/supabase-js";
import { supabaseQueryAuth, supabaseQueryFetch } from "@/lib/supabaseQuery";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: supabaseQueryAuth,
    global: { fetch: supabaseQueryFetch },
  }
);