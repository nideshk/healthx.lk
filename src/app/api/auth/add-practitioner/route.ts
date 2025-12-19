import { NextResponse } from "next/server";
import crypto from "crypto";

import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notify } from "@/lib/notify";

export async function POST(req: Request) {
  try {
    /* --------------------------------------------------
     * 1️⃣ Admin authorization
     * -------------------------------------------------- */
    const { authorized, role } = await requireUser();

    const isAdmin = ["admin", "superadmin"].includes(role);

    if (!authorized || !isAdmin) {
      return NextResponse.json(
        { error: "Only admin can add practitioners" },
        { status: 403 }
      );
    }

    /* --------------------------------------------------
     * 2️⃣ Parse & validate request body
     * -------------------------------------------------- */
    const body = await req.json();

    const {
      email,
      full_name,
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

    if (!email || !full_name) {
      return NextResponse.json(
        { error: "Missing required fields: email, full_name" },
        { status: 400 }
      );
    }

    /* --------------------------------------------------
     * 3️⃣ Generate password (backend only)
     * -------------------------------------------------- */
    const password = crypto.randomBytes(10).toString("base64url");
    console.log(password)

    /* --------------------------------------------------
     * 4️⃣ Create Supabase Auth user (ADMIN API)
     * -------------------------------------------------- */
    const { data: authData, error: authErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
        },
      });

    if (authErr || !authData.user) {
      return NextResponse.json(
        { error: authErr?.message ?? "User creation failed" },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    /* --------------------------------------------------
     * 5️⃣ Create profile
     * -------------------------------------------------- */
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        display_name: full_name,
        role: "practitioner",
        is_active: true,
      });

    if (profileErr) {
      return NextResponse.json(
        { error: "Profile creation failed" },
        { status: 500 }
      );
    }

    /* --------------------------------------------------
     * 6️⃣ Create practitioner record
     * -------------------------------------------------- */
    const { data: practitionerRow, error: practitionerErr } =
      await supabaseAdmin
        .from("practitioners")
        .insert({
          supabase_user_id: userId,
          full_name,
          qualification,
          specialization,
          license_number,
          experience_years,
          contact_email,
          contact_number,
          profile_bio,
          available_services,
          fees,
          is_active: true,
        })
        .select("id")
        .single();

    if (practitionerErr || !practitionerRow) {
      return NextResponse.json(
        { error: "Practitioner creation failed" },
        { status: 500 }
      );
    }

    const practitioner_id = practitionerRow.id;

    /* --------------------------------------------------
     * 7️⃣ Availability (optional)
     * -------------------------------------------------- */
    if (availability) {
      const toISO = (time: string) =>
        new Date(`2000-01-01T${time}:00`).toISOString();

      const { error: availErr } = await supabaseAdmin
        .from("practitioner_availability")
        .insert({
          practitioner_id,
          starts_at: toISO(availability.start_time),
          ends_at: toISO(availability.end_time),
          days_unavailable: availability.days_unavailable || [],
          timezone: availability.timezone || "Asia/Kolkata",
        });

      if (availErr) {
        return NextResponse.json(
          { error: "Availability creation failed" },
          { status: 500 }
        );
      }
    }

    /* --------------------------------------------------
     * 8️⃣ Bank details (optional)
     * -------------------------------------------------- */
    if (bank_details) {
      const { error: bankErr } = await supabaseAdmin
        .from("practitioner_bank_details")
        .insert({
          practitioner_id,
          account_holder_name: bank_details.account_name,
          bank_name: bank_details.bank_name,
          account_number: bank_details.account_number,
          branch_name: bank_details.branch_location ?? null,
          branch_address: bank_details.branch_address ?? null,
          ifsc_code: bank_details.ifsc_code ?? null,
          swift_code: bank_details.swift_code ?? null,
          is_default: true,
        });

      if (bankErr) {
        return NextResponse.json(
          { error: "Bank details creation failed" },
          { status: 500 }
        );
      }
    }

    /* --------------------------------------------------
     * 9️⃣ Send credentials via notification module
     * -------------------------------------------------- */
    await notify({
      userId, // auth.users.id
      role: "practitioner",
      eventType: "practitioner_account_created",
      title: "Your Doctor Account Has Been Created",
      message: `
Hello ${full_name},

Your doctor account has been created.

Login details:
Username: ${email}
Password: ${password}

Please keep these credentials secure.

Regards,
Clinico Team
      `.trim(),
      channels: ["email"],
      payload: {
        email,
        username: email,
        password,
        practitioner_id,
      },
    });

    /* --------------------------------------------------
     * 🔟 Final response (NO password here)
     * -------------------------------------------------- */
    return NextResponse.json({
      success: true,
      practitioner_id,
      message: "Practitioner created and credentials sent successfully",
    });
  } catch (err: any) {
    console.error("ADMIN CREATE PRACTITIONER ERROR:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
