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
  } = body;

  console.log(patient)

  const {
    auth_user_id,
    role,
    patient_id,
    practitioner_id,
    admin: adminUser,
    goveId,
  } = auth.user;

  const { } = auth.user
  /* -------------------------------
     1️⃣ Update Profile (self only)
  ------------------------------- */
  if (profile) {
    await supabaseAdmin
      .from("profiles")
      .update(profile)
      .eq("id", auth_user_id);
  }

  if (goveId) {
    await supabaseAdmin
      .from("user_government_ids")
      .update(goveId)
      .eq("user_id", auth_user_id);
  }

  /* -------------------------------
     2️⃣ Update Patient
  ------------------------------- */
  if (patient) {
    if (!patient_id) {
      return forbidden("Not a patient");
    }

    await supabaseAdmin
      .from("patients")
      .update(patient)
      .eq("id", patient_id);
  }

  /* -------------------------------
     3️⃣ Update Practitioner
  ------------------------------- */
  if (practitioner) {
    if (!practitioner_id) {
      return forbidden("Not a practitioner");
    }

    await supabaseAdmin
      .from("practitioners")
      .update(practitioner)
      .eq("id", practitioner_id);
  }

  /* -------------------------------
     4️⃣ Admin-only updates
  ------------------------------- */
  if (admin) {
    if (!adminUser) {
      return forbidden("Admin access required");
    }

    // Optional policy check
    if (!adminUser.policies.includes("ADMIN_EDIT")) {
      return forbidden("Policy denied");
    }

    await supabaseAdmin
      .from("admin_users")
      .update(admin)
      .eq("id", adminUser.id);
  }

  return Response.json({
    success: true,
    message: "User updated successfully",
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
