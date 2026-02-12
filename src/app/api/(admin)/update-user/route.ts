import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
// import { auditLog, getAuditContext } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

/* ---------------------------------------------
   TYPES
--------------------------------------------- */

type PatientPayload = {
  first_name?: string;
  last_name?: string;
  city?: string;
  state?: string;
  country?: string;
  dob?: string;
  gender?: string;
  contact_number?: string;
  emergency_contact?: string;
  address?: string;
  notes?: string;
  allergies?: string[];     // ✅ ADD
  blood_type?: string; 
};

type PractitionerPayload = {
  first_name?: string;
  last_name?: string;
  city?: string;
  state?: string;

  qualification?: string;
  specialization?: string[];
  experience_years?: number;
  contact_email?: string;
  contact_number?: string;
  profile_bio?: string;
  languages?: string[];
  available_services?: string[];
  fees?: Record<string, any>;

  bank_details?: {
    account_holder_name?: string;
    bank_name?: string;
    account_number?: string;
    branch_name?: string;
    branch_address?: string;
    ifsc_code?: string;
  };
};

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

    if (!authorized || !["admin", "superadmin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { user_id, target_role, patient, practitioner } = body;

    if (!user_id || !target_role) {
      return NextResponse.json(
        { error: "user_id and target_role are required" },
        { status: 400 }
      );
    }

    const cnx = getAuditContext(req, user);

    /* ---------------- PATIENT ---------------- */
    if (target_role === "patient") {
      const profileUpdate = clean({
        first_name: patient?.first_name,
        last_name: patient?.last_name,
        display_name:
          patient?.first_name || patient?.last_name
            ? `${patient?.first_name ?? ""} ${patient?.last_name ?? ""}`.trim()
            : undefined,
        city: patient?.city,
        state: patient?.state,
        country: patient?.country,
      });

      const patientUpdate = clean({
        full_name : 
        patient?.first_name || patient?.last_name
          ? `${patient?.first_name ?? ""} ${patient?.last_name ?? ""}`.trim()
          : undefined,
        dob: patient?.dob,
        gender: patient?.gender,
        contact_number: patient?.contact_number,
        emergency_contact: patient?.emergency_contact,
        address: patient?.address,
        notes: patient?.notes,
        updated_at: new Date().toISOString(),
        allergies: patient?.allergies,
        blood_type: patient?.blood_type
      });

      if (Object.keys(profileUpdate).length)
        await supabaseAdmin.from("profiles").update(profileUpdate).eq("id", user_id);

      if (Object.keys(patientUpdate).length)
        await supabaseAdmin
          .from("patients")
          .update(patientUpdate)
          .eq("supabase_user_id", user_id);

      const editedFields = [
        ...Object.keys(profileUpdate),
        ...Object.keys(patientUpdate),
      ];

      await auditLog({
        ...cnx,
        action: "UPDATED",
        entityType: "PATIENT",
        entityId: user_id,
        source: "admin_panel",
        metadata: { edited_fields: editedFields },
      });

      await notify({
        userId: user_id,
        role: "patient",
        eventType: "profile_updated_by_admin",
        title: "Profile Updated",
        message: `
Your profile has been updated by an administrator.

Updated fields:
${editedFields.map(f => `• ${f.replace(/_/g, " ")}`).join("\n")}
        `.trim(),
        channels: ["email"],
      });

      return NextResponse.json({ success: true });
    }

    /* ---------------- PRACTITIONER ---------------- */
    if (target_role === "practitioner") {
      if (!user_id) {
        return NextResponse.json(
          { error: "user_id (practitioner id) is required" },
          { status: 400 }
        );
      }

      // 🔹 Fetch practitioner using practitioner.id (NOT supabase_user_id)
      const { data: practitionerRow, error: pErr } =
        await supabaseAdmin
          .from("practitioners")
          .select("id, supabase_user_id")
          .eq("id", user_id) // 🔥 IMPORTANT CHANGE
          .single();

      if (pErr || !practitionerRow) {
        return NextResponse.json(
          { error: "Practitioner not found" },
          { status: 404 }
        );
      }

      const supabaseUserId = practitionerRow.supabase_user_id;

      const profileUpdate = clean({
        first_name: practitioner?.first_name,
        last_name: practitioner?.last_name,
        display_name:
          practitioner?.first_name || practitioner?.last_name
            ? `${practitioner?.first_name ?? ""} ${practitioner?.last_name ?? ""}`.trim()
            : undefined,
        city: practitioner?.city,
        state: practitioner?.state,
      });

      const practitionerUpdate = clean({
        first_name: practitioner?.first_name,
        last_name: practitioner?.last_name,
        full_name:
          practitioner?.first_name || practitioner?.last_name
            ? `${practitioner?.first_name ?? ""} ${practitioner?.last_name ?? ""}`.trim()
            : undefined,
        qualification: practitioner?.qualification,
        specialization: practitioner?.specialization,
        experience_years: practitioner?.experience_years,
        contact_email: practitioner?.contact_email,
        contact_number: practitioner?.contact_number,
        profile_bio: practitioner?.profile_bio,
        available_services: practitioner?.available_services,
        fees: practitioner?.fees,
        languages: practitioner?.languages,
        updated_at: new Date().toISOString(),
      });

      // 🔹 Update profile (needs supabase_user_id)
      if (Object.keys(profileUpdate).length)
        await supabaseAdmin
          .from("profiles")
          .update(profileUpdate)
          .eq("id", supabaseUserId);

      // 🔹 Update practitioner using practitioner.id
      if (Object.keys(practitionerUpdate).length)
        await supabaseAdmin
          .from("practitioners")
          .update(practitionerUpdate)
          .eq("id", user_id);

      const editedFields = [
        ...Object.keys(profileUpdate),
        ...Object.keys(practitionerUpdate),
      ];

      /* -------- BANK DETAILS -------- */
      if (practitioner?.bank_details) {
        const bankUpdate = clean({
          account_holder_name: practitioner.bank_details.account_holder_name,
          bank_name: practitioner.bank_details.bank_name,
          account_number: practitioner.bank_details.account_number,
          branch_name: practitioner.bank_details.branch_name,
          branch_address: practitioner.bank_details.branch_address,
          ifsc_code: practitioner.bank_details.ifsc_code,
          updated_at: new Date().toISOString(),
        });

        if (Object.keys(bankUpdate).length > 0) {
          const { data: existingBank } =
            await supabaseAdmin
              .from("practitioner_bank_details")
              .select("id")
              .eq("practitioner_id", user_id)
              .single();

          if (existingBank) {
            await supabaseAdmin
              .from("practitioner_bank_details")
              .update(bankUpdate)
              .eq("practitioner_id", user_id);
          } else {
            await supabaseAdmin
              .from("practitioner_bank_details")
              .insert({
                practitioner_id: user_id,
                ...bankUpdate,
              });
          }

          Object.keys(bankUpdate)
            .filter(k => k !== "updated_at")
            .forEach(k => {
              editedFields.push(`bank_details.${k}`);
            });
        }
      }

      await auditLog({
        ...cnx,
        action: "UPDATED",
        entityType: "PRACTITIONER",
        entityId: user_id, // practitioner id
        source: "admin_panel",
        metadata: { edited_fields: editedFields },
      });

      await notify({
        userId: supabaseUserId, // 🔹 notify auth user
        role: "practitioner",
        eventType: "profile_updated_by_admin",
        title: "Profile Updated",
        message: `
    Your profile has been updated by an administrator.

    Updated fields:
    ${editedFields.map(f => `• ${f.replace(/_/g, " ")}`).join("\n")}
        `.trim(),
        channels: ["email"],
      });

      return NextResponse.json({ success: true });
    }



    return NextResponse.json({ error: "Invalid target_role" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Server error" },
      { status: 500 }
    );
  }
}
