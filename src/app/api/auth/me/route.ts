import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";

export async function GET(req: NextRequest) {
  const { authorized, user } = await requireUser(req);

  if (!authorized) return NextResponse.json({
    success: false,
    message: "Unauthorized"
  });

  return NextResponse.json({
    success: true,
    user
  });
}

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(req: Request) {
  const auth = await requireUser(req);

  if (!auth.authorized) {
    return auth.response;
  }

  const body = await req.json();

  const {
    profile,
    patient,
    practitioner,
    admin,
    goveId: bodyGoveId,
  } = body;

  const {
    auth_user_id,
    role,
    patient_id,
    practitioner_id,
    admin: adminUser,
  } = auth.user;

  const results: any = {};

  /* -------------------------------
     1️⃣ Update Profile (self only)
  ------------------------------- */
  if (profile) {
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(profile)
      .eq("id", auth_user_id)
      .select();
    
    if (profileError) {
        console.error("❌ Profile update error:", profileError);
        return Response.json({ error: "Failed to update profile", details: profileError.message }, { status: 500 });
    }
    results.profile = { updated: (profileData?.length ?? 0) > 0 };
  }

  if (bodyGoveId && bodyGoveId.id_number_encrypted && !bodyGoveId.id_number_encrypted.includes("*")) {
    const { error: govError } = await supabaseAdmin
      .from("user_government_ids")
      .update(bodyGoveId)
      .eq("user_id", auth_user_id);
    
    if (govError) {
        console.error("❌ Gov ID update error:", govError);
    }
  }

  /* -------------------------------
     2️⃣ Update Patient
  ------------------------------- */
  if (patient) {
    if (!patient_id) {
      return forbidden("Not a patient");
    }

    const { data: patientData, error: patientError } = await supabaseAdmin
      .from("patients")
      .update(patient)
      .eq("id", patient_id)
      .select();
    
    if (patientError) {
        console.error("❌ Patient update error:", patientError);
        return Response.json({ error: "Failed to update patient data", details: patientError.message }, { status: 500 });
    }
    results.patient = { updated: (patientData?.length ?? 0) > 0 };
  }

  /* -------------------------------
     3️⃣ Update Practitioner
  ------------------------------- */
  if (practitioner) {
    if (!practitioner_id) {
      return forbidden("Not a practitioner");
    }

    const { data: practitionerData, error: practitionerError } = await supabaseAdmin
      .from("practitioners")
      .update(practitioner)
      .eq("id", practitioner_id)
      .select();
    
    if (practitionerError) {
        console.error("❌ Practitioner update error:", practitionerError);
        return Response.json({ error: "Failed to update practitioner data", details: practitionerError.message }, { status: 500 });
    }
    results.practitioner = { updated: (practitionerData?.length ?? 0) > 0 };
  }

  /* -------------------------------
     4️⃣ Admin-only updates
  ------------------------------- */
  if (admin) {
    if (!adminUser) {
      return forbidden("Admin access required");
    }

    if (!adminUser.policies.includes("ADMIN_EDIT")) {
      return forbidden("Policy denied");
    }

    const { data: adminData, error: adminError } = await supabaseAdmin
      .from("admin_users")
      .update(admin)
      .eq("id", adminUser.id)
      .select();
    
    if (adminError) {
        console.error("❌ Admin update error:", adminError);
        return Response.json({ error: "Failed to update admin data", details: adminError.message }, { status: 500 });
    }
    results.admin = { updated: (adminData?.length ?? 0) > 0 };
  }

  return Response.json({
    success: true,
    message: "User updated successfully",
    results
  });
}

/* -------------------------------
   Helpers
------------------------------- */

function forbidden(message: string) {
  return Response.json(
    { error: message },
    { status: 403 }
  );
}
