import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { decrypt } from "@/lib/crypto";
import { requireUser } from "@/lib/authGuard";
import { createPractitioner } from "@/lib/createPractitioner";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

type ActionType = "approve" | "reject";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let createdUserId: string | null = null;
  let createdPractitionerId: string | null = null;

  /* --------------------------------------------------
   * 1️⃣ Authentication & Authorization
   * -------------------------------------------------- */
  const { authorized, role, user } = await requireUser(req);
  const cnx = getAuditContext(req, user);

  if (!authorized || !["admin", "superadmin"].includes(role)) {
    await auditLog({
      ...cnx,
      action: "FAILED_ACCESS",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "unauthorized_or_insufficient_role_application_action",
        role,
      },
    });

    return NextResponse.json(
      {
        success: false,
        message: "Access denied. Admin privileges required.",
      },
      { status: 403 }
    );
  }

  /* --------------------------------------------------
   * 2️⃣ Resolve route params (async-safe)
   * -------------------------------------------------- */
  const { id: applicationId } = await context.params;

  if (!applicationId) {
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "missing_application_id",
      },
    });
    return NextResponse.json(
      {
        success: false,
        message: "Application ID is required.",
      },
      { status: 400 }
    );
  }

  /* --------------------------------------------------
   * 3️⃣ Parse request body safely
   * -------------------------------------------------- */
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const action: ActionType = body?.action;

  if (!action || !["approve", "reject"].includes(action)) {
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ADMIN_USER",
      entityId: applicationId,
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "invalid_action",
        provided_action: action,
      },
    });
    return NextResponse.json(
      {
        success: false,
        message: "Action must be either 'approve' or 'reject'.",
      },
      { status: 400 }
    );
  }

  /* --------------------------------------------------
   * 4️⃣ Fetch application (PENDING ONLY)
   * -------------------------------------------------- */
  const { data: app, error: fetchErr } = await supabaseAdmin
    .from("practitioner_applications")
    .select("*")
    .eq("id", applicationId)
    .eq("status", "pending")
    .single();

  if (fetchErr || !app) {
    return NextResponse.json(
      {
        success: false,
        message: "Application not found or already processed.",
      },
      { status: 404 }
    );
  }

  /* ==================================================
   * 🔴 REJECT FLOW
   * ================================================== */
  if (action === "reject") {
    const reason =
      typeof body?.reason === "string" && body.reason.trim().length > 0
        ? body.reason.trim()
        : "Application did not meet the required criteria.";

    const { error: rejectErr } = await supabaseAdmin
      .from("practitioner_applications")
      .update({
        status: "rejected",
        rejected_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", app.id);

    if (rejectErr) {
      await auditLog({
        ...cnx,
        action: "FAILED",
        entityType: "ADMIN_USER",
        entityId: app.id,
        purpose: "operations",
        source: "dashboard",
        metadata: {
          reason: "reject_update_failed",
        },
      });
      return NextResponse.json(
        {
          success: false,
          message: "Failed to reject application.",
        },
        { status: 500 }
      );
    }

    await auditLog({
      ...cnx,
      action: "DENIED",
      entityType: "ADMIN_USER",
      entityId: app.id,
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason_provided: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Application rejected successfully.",
    });
  }

  /* ==================================================
   * 🟢 APPROVE FLOW (NO THROW, FULL ROLLBACK)
   * ================================================== */

  // Only editable field
  // const finalLicenseNumber =
  //   typeof body?.license_number === "string"
  //     ? body.license_number
  //     : app.license_number;

  // Decrypt password from application
  const password = decrypt(app.encrypted_password);

  if (!password) {
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ADMIN_USER",
      entityId: app.id,
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "password_decryption_failed",
      },
    });
    return NextResponse.json(
      {
        success: false,
        message: "Invalid or corrupted application password",
      },
      { status: 500 }
    );
  }

  /* --------------------------------------------------
    Merge Application Data with Admin Overrides
  -------------------------------------------------- */

  const practitionerPayload = {
    practitioner_id: app.id,

    email: body?.email ?? app.email,
    password,

    first_name: body?.first_name ?? app.first_name,
    last_name: body?.last_name ?? app.last_name,

    qualification: body?.qualification ?? app.qualification,
    specialization: body?.specialization ?? app.specialization,

    license_number: body?.license_number ?? app.license_number,
    experience_years:
      body?.experience_years === "" || app.experience_years === ""
        ? null
        : body?.experience_years ?? app.experience_years,

    contact_email: body?.email ?? body?.contact_email ?? app.contact_email,
    contact_number: body?.contact_number ?? app.contact_number,

    profile_bio: body?.profile_bio ?? app.profile_bio,
    available_services: body?.available_services ?? app.available_services,
    fees: body?.fees ?? app.fees,

    bank_details:
      body?.bank_details ??
      (body?.bank_name || body?.account_name || body?.account_number
        ? {
          bank_name: body?.bank_name,
          account_name: body?.account_name,
          account_number: body?.account_number,
          branch_location: body?.branch_location ?? null,
          branch_address: body?.branch_address ?? null,
          ifsc_code: body?.ifsc_code ?? null,
          swift_code: body?.swift_code ?? null,
        }
        : app.bank_details),

    documents: (Array.isArray(body?.documents)
      ? body.documents
      : Array.isArray(app.documents)
        ? app.documents
        : []).filter((d: any) => d.document_type !== "signature"),

    signature_url: (Array.isArray(body?.documents)
      ? body.documents
      : Array.isArray(app.documents)
        ? app.documents
        : []).find((d: any) => d.document_type === "signature")?.file_url ?? null,

    languages: Array.isArray(body?.languages)
      ? body.languages
      : Array.isArray(app.languages)
        ? app.languages
        : [],
  };


  /* --------------------------------------------------
   * 1️⃣ Create practitioner
   * -------------------------------------------------- */
  const result = await createPractitioner(practitionerPayload);

  if (!result.success) {
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ADMIN_USER",
      entityId: applicationId,
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "create_practitioner_failed",
        message: result.message,
      },
    });

    return NextResponse.json(
      {
        success: false,
        message: result.message,
      },
      { status: 500 }
    );
  }

  createdUserId = result?.userId ?? null;
  createdPractitionerId = result.finalPractitionerId ?? null;

  /* --------------------------------------------------
 * 2️⃣ DELETE application (CRITICAL)
 * -------------------------------------------------- */
  const { error: deleteErr } = await supabaseAdmin
    .from("practitioner_applications")
    .delete()
    .eq("id", app.id);

  if (deleteErr) {
    console.error("APPLICATION UPDATE FAILED — ROLLING BACK", deleteErr);

    /* 🔥 ROLLBACK */
    if (createdPractitionerId) {
      await supabaseAdmin
        .from("practitioners")
        .delete()
        .eq("id", createdPractitionerId);
    }

    if (createdUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      await supabaseAdmin.from("profiles").delete().eq("id", createdUserId);
    }

    const cnx = getAuditContext(req, user);
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      entityId: createdPractitionerId || createdUserId || undefined,
      metadata: {
        success: true,
      }
    });
    return NextResponse.json(
      {
        success: false,
        message:
          "Practitioner was created but approval failed. All changes were rolled back.",
      },
      { status: 500 }
    );
  }

  await auditLog({
    ...cnx,
    action: "APPROVED",
    entityType: "ADMIN_USER",
    purpose: "operations",
    source: "dashboard",
    entityId: createdPractitionerId || undefined,
    metadata: {
      success: true,
    }
  });


  /* --------------------------------------------------
   * ✅ SUCCESS
   * -------------------------------------------------- */
  return NextResponse.json({
    success: true,
    practitioner_id: createdPractitionerId,
    message: "Application approved successfully.",
  });
}
