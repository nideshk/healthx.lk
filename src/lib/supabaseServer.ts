
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export async function createClient() {
    let cookieStore;
    try{

         cookieStore = await cookies();
    }
    catch(error){
        console.log("Error in creating supabase client: ", error);
    }
    finally{
         cookieStore = cookies();
    }
  return createServerComponentClient({ cookies: () => cookieStore });
}
