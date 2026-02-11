import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { computeDiscount } from "@/lib/coupons/computeDiscount";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ practitionerId: string }> }
) {
  try {
    const { practitionerId } = await context.params;
    const { appointment_type_id, attendeeList = [], coupon_code, starts_at, ends_at, pre_consultation, consent } =
      await req.json();
    console.log("coupon_code", coupon_code)
    // ---------------------------
    // 1️⃣ Auth
    // ---------------------------
    const { authorized, user }: any = await requireUser(req);
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patient_id = user?.patient_id;
    if (!patient_id) {
      return NextResponse.json(
        { error: "Patient profile missing" },
        { status: 400 }
      );
    }

    if (!starts_at || !ends_at || !appointment_type_id || !practitionerId) {
      return NextResponse.json(
        { error: "Missing booking parameters" },
        { status: 400 }
      );
    }

    // ---------------------------
    // 3️⃣ Fetch Appointment Type (SOURCE OF TRUTH)
    // ---------------------------
    const { data: appointmentType, error: typeErr } =
      await supabaseClient
        .from("appointment_type")
        .select(
          `
          id,
          name,
          base_fee,
          platform_fee,
          duration_mins,
          max_attendee,
          extra_fee_per_attendee
        `
        )
        .eq("id", appointment_type_id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .single();

    if (typeErr || !appointmentType) {
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
      return NextResponse.json(
        { error: "Time slot already booked" },
        { status: 409 }
      );
    }

    const { data: practitioner } = await supabaseAdmin.from("practitioners").select("*").eq("id", practitionerId).single();

    if (!practitioner) {
      return NextResponse.json(
        { error: "Invalid practitioner" },
        { status: 400 }
      );
    }

    const consultation_fee_by_practitioner = practitioner.fees[appointmentType.id];
    console.log("consultation_fee_by_practitioner", consultation_fee_by_practitioner)


    const consultation_fee = consultation_fee_by_practitioner.fee || appointmentType.base_fee + appointmentType.platform_fee;
    const platform_fee = appointmentType.platform_fee;

    // ---------------------------
    // 6️⃣ Create Appointment
    // ---------------------------
    let discount_total = 0;
    let platform_discount = 0;
    let practitioner_discount = 0;
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
          platform_fee
        }
      });

      discount_total = discount.discount_total;
      platform_discount = discount.platform_discount;
      practitioner_discount = discount.practitioner_discount;
    }

    const fees_charged = (consultation_fee_by_practitioner.fee || appointmentType.base_fee) + (appointmentType.platform_fee) + (100 * attendeeList.length) - (discount_total || 0);
    const tax_amount = fees_charged * 0.08;
    console.log("appointmentType", appointmentType)
    console.log(fees_charged)

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
          additional_attendees: attendeeList,
          // 💰 PRICING SNAPSHOT
          fee_charged: fees_charged,
          consultation_fee: consultation_fee,
          service_fee: 100 * attendeeList.length,
          tax_amount: tax_amount,
          platform_fee: platform_fee,

          currency: "LKR",
        })
        .select()
        .single();

    console.log("fees chargedd", appointment)
    if (insertError || !appointment) {
      console.log(insertError)
      return NextResponse.json(
        { error: "Failed to create appointment" },
        { status: 500 }
      );
    }

    // ---------------------------
    // 7️⃣ Insert Consent
    // ---------------------------
    if (consent) {
      const { data: consentData, error: consentError } =
        await supabaseClient
          .from("consents")
          .insert({
            appointment_id: appointment.id,
            telehealth: consent.telehealth ?? false,
            terms: consent.terms ?? false,
            accepted_at: new Date(),
            version: "v1",
          })
          .select()
          .single();

      if (consentError || !consentData) {
        console.error("Consent error:", consentError);
        return NextResponse.json(
          { error: "Failed to create consent" },
          { status: 500 }
        );
      }
    }

    // ---------------------------
    // 8️⃣ Insert Pre-consultation
    // ---------------------------
    if (pre_consultation) {
      const { data: preConsultationData, error: preConsultationError } =
        await supabaseClient
          .from("preconsult_responses")
          .insert({
            appointment_id: appointment.id,
            raw_payload: pre_consultation,
            patient_id: patient_id,
          })
          .select()
          .single();

      if (preConsultationError || !preConsultationData) {
        console.error("Preconsult error:", preConsultationError);
        return NextResponse.json(
          { error: "Failed to create pre consultation" },
          { status: 500 }
        );
      }
    }


    await supabaseAdmin.from("appointment_draft").delete().eq("patient_id", patient_id)
    // ---------------------------
    // 7️⃣ Return payment payload
    // ---------------------------
    return NextResponse.json({
      success: true,
      appointment,
      paymentPayload: {
        appointment_id: appointment.id,
        amount: fees_charged,
        consultation_fee: consultation_fee,
        platform_fee: platform_fee, // informational
        currency: "LKR",
      },
    });
  } catch (err: any) {
    console.error("❌ book-appointment error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
