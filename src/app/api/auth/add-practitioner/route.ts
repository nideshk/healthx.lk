import { NextResponse } from "next/server";
import crypto from "crypto";

import { requireUser } from "@/lib/authGuard";
import { createPractitioner } from "@/lib/createPractitioner";

function validateEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}


export async function POST(req: Request) {
  try {
    /* --------------------------------------------------
     * 1️⃣ Authentication & Authorization
     * -------------------------------------------------- */
    const { authorized, role } = await requireUser();

    if (!authorized || !["admin", "superadmin"].includes(role)) {
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
      availability,
      bank_details,
    } = body;

    if (!email || !first_name) {
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
    const { practitioner_id } = await createPractitioner({
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
      availability,
      bank_details,
    });

    /* --------------------------------------------------
     * 5️⃣ Final response (NO password)
     * -------------------------------------------------- */
    return NextResponse.json({
      success: true,
      practitioner_id,
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
