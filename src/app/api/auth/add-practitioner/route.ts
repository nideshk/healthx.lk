import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { requireUser } from "@/lib/authGuard";
import { createPractitioner } from "@/lib/createPractitioner";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

function validateEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}


export async function POST(req: NextRequest) {
  try {
    /* --------------------------------------------------
     * 1️⃣ Authentication & Authorization
     * -------------------------------------------------- */
    const { authorized, role, user } = await requireUser(req);

    const cnx = getAuditContext(req, user);

    if (!authorized || !["admin", "superadmin"].includes(role)) {
      await auditLog({
        ...cnx,
        action: "FAILED",
        source: "dashboard",
        entityType: "PRACTITIONER",
        entityId: "",
        metadata: {
          "error": "Unauthorized"
        },
        purpose: "operations",
      })
      return NextResponse.json(
        { success: false, message: "Only admin can add practitioners" },
        { status: 403 }
      );
    }

    /* --------------------------------------------------
     * 2️⃣ Parse & validate request body
     * -------------------------------------------------- */
    const body = await req.json();

    const {
      email,
      first_name,
      last_name,
      state,
      city,
      qualification,
      specialization,
      license_number,
      experience_years,
      contact_email,
      contact_number,
      profile_bio,
      fees,
      available_services,
      // availability,
      bank_details,
      languages
    } = body;

    if (!email || !first_name) {
      await auditLog({
        ...cnx,
        action: "FAILED",
        source: "dashboard",
        entityType: "PRACTITIONER",
        entityId: "",
        metadata: {
          "error": "Missing required fields: email, first_name"
        },
        purpose: "operations",
      })
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields: email, first_name",
        },
        { status: 400 }
      );
    }

    /* Email format validation */
    if (!validateEmail(email)) {
      await auditLog({
        ...cnx,
        action: "FAILED",
        source: "dashboard",
        entityType: "PRACTITIONER",
        entityId: "",
        metadata: {
          "error": "Invalid email format"
        },
        purpose: "operations",
      })
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email format",
        },
        { status: 400 }
      );
    }

    /* --------------------------------------------------
     * 3️⃣ Generate password (ADMIN ONLY)
     * -------------------------------------------------- */
    const password = crypto.randomBytes(10).toString("base64url");

    /* --------------------------------------------------
     * 4️⃣ Create practitioner (shared core logic)
     * -------------------------------------------------- */
    const result = await createPractitioner({
      email,
      password,
      first_name,
      last_name,
      state,
      city,
      qualification,
      specialization,
      license_number,
      experience_years,
      contact_email,
      contact_number,
      profile_bio,
      fees,
      available_services,
      // availability,
      bank_details,
      languages
    });

    await auditLog({
      ...cnx,
      action: "CREATED",
      source: "dashboard",
      entityType: "PRACTITIONER",
      entityId: result.finalPractitionerId,
      metadata: {
        "practitioner_id": result.finalPractitionerId,
      },
      purpose: "operations",
    })

    return NextResponse.json({
      success: true,
      practitioner_id: result.finalPractitionerId,
      message: "Practitioner created successfully",
    });
  } catch (err: any) {
    console.error("ADMIN MANUAL CREATE PRACTITIONER ERROR:", err);
    return NextResponse.json(
      {
        success: false,
        message: err?.message ?? "Internal server error",
      },
      { status: 500 }
    );
  }
}
