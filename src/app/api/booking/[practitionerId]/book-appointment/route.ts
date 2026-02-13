import { auditLog } from "@/lib/audit/auditLog";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { requireUser } from "@/lib/authGuard";
import { computeDiscount } from "@/lib/coupons/computeDiscount";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ practitionerId: string }> }
) {
  try {
    const { practitionerId } = await context.params;

    const {
      appointment_type_id,
      attendeeList = [], // now array of objects
      coupon_code,
      starts_at,
      ends_at,
      pre_consultation,
      consent,
    } = await req.json();

    // ---------------------------
    // 1️⃣ Auth
    // ---------------------------
    const { authorized, user }: any = await requireUser(req);
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cnx = getAuditContext(req, user);



    const patient_id = user?.patient_id;
    if (!patient_id) {
      await auditLog({
        ...cnx,
        action: "FAILED",
        source: "dashboard",
        entityType: "USER",
        entityId: user.auth_user_id,
        metadata: {
          "user_id": user.auth_user_id,
        },
        purpose: "operations",
      })
      return NextResponse.json(
        { error: "Patient profile missing" },
        { status: 400 }
      );
    }

    if (!starts_at || !ends_at || !appointment_type_id || !practitionerId) {
      await auditLog({
        ...cnx,
        action: "FAILED",
        source: "dashboard",
        entityType: "USER",
        entityId: user.auth_user_id,
        metadata: {
          "user_id": user.auth_user_id,
        },
        purpose: "operations",
      })
      return NextResponse.json(
        { error: "Missing booking parameters" },
        { status: 400 }
      );
    }

    // ---------------------------
    // 2️⃣ Normalize attendees
    // ---------------------------
    const normalizedAttendees = (attendeeList || []).map((a: any) => ({
      email: a.email,
      relationship: a.relationship || "other",
    }));

    const attendeeCount = normalizedAttendees.length;

    // ---------------------------
    // 3️⃣ Fetch Appointment Type
    // ---------------------------
    const { data: appointmentType, error: typeErr } =
      await supabaseClient
        .from("appointment_type")
        .select(`
          id,
          name,
          base_fee,
          platform_fee,
          duration_mins,
          max_attendee,
          extra_fee_per_attendee
        `)
        .eq("id", appointment_type_id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .single();

    if (typeErr || !appointmentType) {
      await auditLog({
        ...cnx,
        action: "FAILED",
        source: "dashboard",
        entityType: "USER",
        entityId: user.auth_user_id,
        metadata: {
          "user_id": user.auth_user_id,
        },
        purpose: "operations",
      })
      return NextResponse.json(
        { error: "Invalid appointment type" },
        { status: 400 }
      );
    }

    // ---------------------------
    // 4️⃣ Slot conflict check
    // ---------------------------
    const { data: existing } = await supabaseClient
      .from("appointments")
      .select("id")
      .eq("practitioner_id", practitionerId)
      .eq("starts_at", starts_at)
      .neq("status", "cancelled")
      .maybeSingle();

    if (existing) {
      await auditLog({
        ...cnx,
        action: "FAILED",
        source: "dashboard",
        entityType: "USER",
        entityId: user.auth_user_id,
        metadata: {
          "error": "Time slot already booked",
          "user_id": user.auth_user_id,
        },
        purpose: "operations",
      })
      return NextResponse.json(
        { error: "Time slot already booked" },
        { status: 409 }
      );
    }

    const { data: practitioner } = await supabaseAdmin
      .from("practitioners")
      .select("*")
      .eq("id", practitionerId)
      .single();

    if (!practitioner) {
      await auditLog({
        ...cnx,
        action: "FAILED",
        source: "dashboard",
        entityType: "USER",
        entityId: user.auth_user_id,
        metadata: {
          "error": "Invalid practitioner",
          "user_id": user.auth_user_id,
        },
        purpose: "operations",
      })
      return NextResponse.json(
        { error: "Invalid practitioner" },
        { status: 400 }
      );
    }

    const consultation_fee_by_practitioner =
      practitioner.fees[appointmentType.id];

    const consultation_fee =
      consultation_fee_by_practitioner.fee ||
      appointmentType.base_fee + appointmentType.platform_fee;

    const platform_fee = appointmentType.platform_fee;

    // ---------------------------
    // 5️⃣ Discount
    // ---------------------------
    let discount_total = 0;

    if (coupon_code) {
      const { data: coupon } = await supabaseAdmin
        .from("discount_coupons")
        .select("*")
        .eq("code", coupon_code)
        .eq("is_active", true)
        .single();

      if (!coupon) {
        return NextResponse.json(
          { error: "Invalid coupon" },
          { status: 400 }
        );
      }

      const discount = computeDiscount({
        coupon,
        pricing: {
          consultation_fee,
          platform_fee,
        },
      });

      discount_total = discount.discount_total;
    }

    // ---------------------------
    // 6️⃣ Pricing
    // ---------------------------
    const attendeeServiceFee = 100 * attendeeCount;

    const fees_charged =
      (consultation_fee_by_practitioner.fee ||
        appointmentType.base_fee) +
      appointmentType.platform_fee +
      attendeeServiceFee -
      (discount_total || 0);

    const tax_amount = fees_charged * 0.08;

    // ---------------------------
    // 7️⃣ Create Appointment
    // ---------------------------
    const { data: appointment, error: insertError } =
      await supabaseClient
        .from("appointments")
        .insert({
          practitioner_id: practitionerId,
          patient_id,
          appointment_type_id,
          starts_at,
          ends_at,
          status: "pending",
          source: "web",
          room_key: crypto.randomUUID(),

          // 🔑 JSONB attendees
          additional_attendees: normalizedAttendees,

          // pricing
          fee_charged: fees_charged,
          consultation_fee: consultation_fee,
          service_fee: attendeeServiceFee,
          tax_amount: tax_amount,
          platform_fee: platform_fee,
          currency: "LKR",
        })
        .select()
        .single();

    if (insertError || !appointment) {
      await auditLog({
        ...cnx,
        action: "FAILED",
        source: "dashboard",
        entityType: "USER",
        entityId: user.auth_user_id,
        metadata: {
          "error": "Failed to create appointment",
          "user_id": user.auth_user_id,
        },
        purpose: "operations",
      })
      return NextResponse.json(
        { error: "Failed to create appointment" },
        { status: 500 }
      );
    }

    // ---------------------------
    // Consent
    // ---------------------------
    if (consent) {
      await supabaseClient.from("consents").insert({
        appointment_id: appointment.id,
        telehealth: consent.telehealth ?? false,
        terms: consent.terms ?? false,
        accepted_at: new Date(),
        version: "v1",
      });
    }

    // ---------------------------
    // Pre-consultation
    // ---------------------------
    if (pre_consultation) {
      await supabaseClient.from("preconsult_responses").insert({
        appointment_id: appointment.id,
        raw_payload: pre_consultation,
        patient_id: patient_id,
      });
    }

    await supabaseAdmin
      .from("appointment_draft")
      .delete()
      .eq("patient_id", patient_id);

    await auditLog({
      ...cnx,
      action: "CREATED",
      source: "dashboard",
      entityType: "USER",
      entityId: user.auth_user_id,
      metadata: {
        "user_id": user.auth_user_id,
      },
      purpose: "operations",
    })

    return NextResponse.json({
      success: true,
      appointment,
      paymentPayload: {
        appointment_id: appointment.id,
        amount: fees_charged,
        consultation_fee: consultation_fee,
        platform_fee: platform_fee,
        currency: "LKR",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
