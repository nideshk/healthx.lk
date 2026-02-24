import { supabaseAdmin } from "./supabaseAdmin";

export const dynamic = "force-dynamic";
type AuthorizedUser = {
  auth_user_id: string;
  role: string;
  profile: any;
  user: any;
  admin: {
    id: string;
    role: string;
    policies: string[];
  } | null;
  phone: string | null;
  patient_id: string | null;
  practitioner_id: string | null;
  practitioner: any;
  patient: any;
  goveId?: any;
};

type RequireUserResult =
  | {
    authorized: true;
    role: string;
    user: AuthorizedUser;
    response: "";
  }
  | {
    authorized: false;
    role: null;
    user: null;
    response: Response;
  };

export async function requireUser(req: Request): Promise<RequireUserResult> {
  if (!req) {
    throw new Error(
      "requireUser(req) was called without a Request object"
    );
  }

  /* -------------------------------
     1️⃣ Read Authorization header
  ------------------------------- */
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return unauthorized();
  }

  const accessToken = authHeader.replace("Bearer ", "");

  /* -------------------------------
     2️⃣ Verify token
  ------------------------------- */
  const { data, error } =
    await supabaseAdmin.auth.getUser(accessToken);

  if (error || !data?.user) {
    return unauthorized();
  }

  const user = data.user;
  const auth_user_id = user.id;

  /* -------------------------------
     3️⃣ Fetch profile
  ------------------------------- */
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", auth_user_id)
    .single();

  if (!profile) {
    return forbidden("Profile not found");
  }

  /* -------------------------------
     4️⃣ Domain mapping
  ------------------------------- */
  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select("*")
    .eq("supabase_user_id", auth_user_id)
    .maybeSingle();

  const { data: practitioner } = await supabaseAdmin
    .from("practitioners")
    .select("*")
    .eq("supabase_user_id", auth_user_id)
    .maybeSingle();


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

  const { data: goveId } = await supabaseAdmin.from("user_government_ids").select("*").eq("user_id", auth_user_id).maybeSingle();
  function maskId(id: string) {
    if (!id) return null;
    const last4 = id.slice(-4);
    return `******${last4}`;
  }


  return {
    authorized: true,
    role: profile.role,
    response: "",
    user: {
      auth_user_id,
      role: profile.role,
      profile,
      user,
      admin,
      phone: patient?.contact_number ?? null,
      patient_id: patient?.id ?? null,
      patient: patient,
      practitioner_id: practitioner?.id ?? null,
      practitioner: practitioner,
      goveId: {
        id_number_encrypted: maskId(goveId?.id_number_encrypted),
        ...goveId
      },
    },
  };
}

/* -------------------------------
   Helpers
------------------------------- */

function unauthorized(): RequireUserResult {
  return {
    authorized: false,
    user: null,
    role: null,
    response: Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    ),
  };
}

function forbidden(message: string): RequireUserResult {
  return {
    authorized: false,
    user: null,
    role: null,
    response: Response.json(
      { error: message },
      { status: 403 }
    ),
  };
}
