import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { notify } from "@/lib/notify";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

/* ---------------------------------------------
   HELPERS
--------------------------------------------- */

function clean<T extends Record<string, any>>(obj?: T) {
  if (!obj) return {};
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  );
}

/* ---------------------------------------------
   PATCH HANDLER
--------------------------------------------- */

export async function PATCH(req: NextRequest) {
  try {
    const { authorized, role, user } = await requireUser(req);

    if (!authorized || role !== "practitioner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const cnx = getAuditContext(req, user);

    /* =====================================================
       PRACTITIONER → PATIENT (ALLERGIES ONLY)
    ===================================================== */
    if (body.patient_id) {
      const { patient_id, allergies } = body;

      if (!Array.isArray(allergies)) {
        return NextResponse.json(
          { error: "allergies must be an array of strings" },
          { status: 400 }
        );
      }

      const normalizedAllergies = allergies
        .map((a: string) => a.trim())
        .filter(Boolean);

      // verify practitioner → patient relationship
      const { data: allowed } = await supabaseAdmin
        .from("appointments")
        .select("id")
        .eq("patient_id", patient_id)
        .eq("practitioner_id", user.practitioner_id)
        .limit(1)
        .single();

      if (!allowed) {
        return NextResponse.json(
          { error: "Not allowed to edit this patient" },
          { status: 403 }
        );
      }

      await supabaseAdmin
        .from("patients")
        .update({
          allergies: normalizedAllergies,
          updated_at: new Date().toISOString(),
        })
        .eq("id", patient_id);

      await auditLog({
        ...cnx,
        action: "UPDATED",
        entityType: "PATIENT",
        entityId: patient_id,
        source: "user_portal",
        metadata: { edited_fields: ["allergies"] },
      });

      await notify({
        userId: patient_id,
        role: "patient",
        eventType: "allergies_updated",
        title: "Medical Information Updated",
        message: `
Your clinician has updated the following field:

• allergies
        `.trim(),
        channels: ["email"],
      });

      return NextResponse.json({ success: true });
    }

    /* =====================================================
       PRACTITIONER → SELF UPDATE
    ===================================================== */

    const firstName = body.first_name?.trim();
    const lastName = body.last_name?.trim();
    const derivedName =
      firstName || lastName
        ? `${firstName ?? ""} ${lastName ?? ""}`.trim()
        : undefined;

    const profileUpdate = clean({
      first_name: firstName,
      last_name: lastName,
      display_name: derivedName,
      city: body.city,
      state: body.state,
    });

    const practitionerUpdate = clean({
      full_name: derivedName,
      qualification: body.qualification,
      specialization: body.specialization,
      experience_years: body.experience_years,
      contact_email: body.contact_email,
      contact_number: body.contact_number,
      profile_bio: body.profile_bio,
      available_services: body.available_services,
      fees: body.fees,
      updated_at: new Date().toISOString(),
    });

    if (Object.keys(profileUpdate).length) {
      await supabaseAdmin
        .from("profiles")
        .update(profileUpdate)
        .eq("id", user.auth_user_id);
    }

    if (Object.keys(practitionerUpdate).length) {
      await supabaseAdmin
        .from("practitioners")
        .update(practitionerUpdate)
        .eq("supabase_user_id", user.auth_user_id);
    }

    const editedFields = [
      ...Object.keys(profileUpdate),
      ...Object.keys(practitionerUpdate),
    ].filter(f => f !== "updated_at");

    if (editedFields.length === 0) {
      return NextResponse.json(
        { error: "No editable fields provided" },
        { status: 400 }
      );
    }

    await auditLog({
      ...cnx,
      action: "UPDATED",
      entityType: "PRACTITIONER",
      entityId: user.auth_user_id,
      source: "user_portal",
      metadata: { edited_fields: editedFields },
    });

    await notify({
      userId: user.auth_user_id,
      role: "practitioner",
      eventType: "profile_updated",
      title: "Profile Updated",
      message: `
You have updated your profile.

Updated fields:
${editedFields.map(f => `• ${f.replace(/_/g, " ")}`).join("\n")}
      `.trim(),
      channels: ["email"],
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PATCH /api/practitioner/profile error:", err);
    return NextResponse.json(
      { error: err.message ?? "Server error" },
      { status: 500 }
    );
  }
}
