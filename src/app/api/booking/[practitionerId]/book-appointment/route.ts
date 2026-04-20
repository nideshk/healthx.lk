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
  const requestId = crypto.randomUUID();
  try {
    const { practitionerId } = await context.params;

    const body = await req.json();
    const {
      appointment_type_id,
      attendeeList = [], // now array of objects
      coupon_code,
      starts_at,
      ends_at,
      pre_consultation,
      consent,
    } = body;

    console.log("[API][REQUEST]", {
      requestId,
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    });

    console.log("[API][PARAMS]", {
      requestId,
      practitionerId,
      appointment_type_id,
      starts_at,
      ends_at,
      coupon_code
    });

    // ---------------------------
    // 1️⃣ Auth
    // ---------------------------
    const { authorized, user }: any = await requireUser(req);
    if (!authorized) {
      console.log("[AUTH][FAILURE]", { requestId, timestamp: new Date().toISOString() });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cnx = getAuditContext(req, user);

    const patient_id = user?.patient_id;
    if (!patient_id) {
      console.log("[API][ERROR]", { requestId, message: "Patient profile missing", userId: user.id });
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
      console.log("[API][VALIDATION_ERROR]", { requestId, missingFields: true });
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
    console.log("[DB][QUERY_START]", {
      requestId,
      table: "appointment_type",
      filter: { id: appointment_type_id }
    });

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
    
    console.log("[DB][QUERY_RESULT]", {
      requestId,
      data: appointmentType,
      error: typeErr
    });

    if (typeErr || !appointmentType) {
      console.error("[DB][ERROR]", {
        requestId,
        code: typeErr?.code,
        message: typeErr?.message,
        appointment_type_id
      });
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
    console.log("[DB][QUERY_START]", {
      requestId,
      table: "appointments",
      action: "conflict_check",
      practitioner_id: practitionerId,
      starts_at
    });

    const { data: existing, error: existError } = await supabaseClient
      .from("appointments")
      .select("id")
      .eq("practitioner_id", practitionerId)
      .eq("starts_at", starts_at)
      .neq("status", "cancelled")
      .neq("status", "payment_cancelled")
      .maybeSingle();
    
    console.log("[DB][QUERY_RESULT]", {
      requestId,
      data: existing,
      error: existError
    });

    if (existing) {
      console.log("[API][CONFLICT]", { requestId, message: "Time slot already booked", practitionerId, starts_at });
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

    console.log("[DB][QUERY_START]", {
      requestId,
      table: "practitioners",
      filter: { id: practitionerId }
    });

    const { data: practitioner, error: practError } = await supabaseAdmin
      .from("practitioners")
      .select("*")
      .eq("id", practitionerId)
      .single();

    console.log("[DB][QUERY_RESULT]", {
      requestId,
      data: practitioner,
      error: practError
    });

    if (!practitioner) {
      console.error("[DB][ERROR]", {
        requestId,
        code: practError?.code,
        message: practError?.message || "Practitioner not found",
        practitionerId
      });
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
      consultation_fee_by_practitioner?.fee ??
      (appointmentType.base_fee + appointmentType.platform_fee);

    const platform_fee = appointmentType.platform_fee;

    // ---------------------------
    // 5️⃣ Discount
    // ---------------------------
    let discount_total = 0;

    if (coupon_code) {
      console.log("[DB][QUERY_START]", {
        requestId,
        table: "discount_coupons",
        filter: { code: coupon_code }
      });

      const { data: coupon, error: couponError } = await supabaseAdmin
        .from("discount_coupons")
        .select("*")
        .eq("code", coupon_code)
        .eq("is_active", true)
        .single();
      
      console.log("[DB][QUERY_RESULT]", {
        requestId,
        data: coupon,
        error: couponError
      });

      if (!coupon) {
        console.log("[API][ERROR]", { requestId, message: "Invalid coupon", coupon_code });
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
    const attendeeServiceFee = 500 * attendeeCount;

    const fees_charged =
      (consultation_fee_by_practitioner?.fee ??
        appointmentType.base_fee) +
      (appointmentType.platform_fee ?? 0) +
      attendeeServiceFee -
      (discount_total ?? 0);

    const tax_amount = fees_charged * 0.08;

    // ---------------------------
    // 7️⃣ Create Appointment
    // ---------------------------
    console.log("[DB][QUERY_START]", {
      requestId,
      table: "appointments",
      action: "insert"
    });

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
    
    console.log("[DB][QUERY_RESULT]", {
      requestId,
      data: appointment,
      error: insertError
    });

    if (insertError || !appointment) {
      console.error("[DB][ERROR]", {
        requestId,
        code: insertError?.code,
        message: insertError?.message,
        details: insertError?.details
      });
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
      console.log("[DB][QUERY_START]", {
        requestId,
        table: "consents",
        action: "insert",
        appointment_id: appointment.id
      });
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
      console.log("[DB][QUERY_START]", {
        requestId,
        table: "preconsult_responses",
        action: "insert",
        appointment_id: appointment.id
      });
      await supabaseClient.from("preconsult_responses").insert({
        appointment_id: appointment.id,
        raw_payload: pre_consultation,
        patient_id: patient_id,
      });
    }

    console.log("[DB][QUERY_START]", {
      requestId,
      table: "appointment_draft",
      action: "delete",
      patient_id
    });
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

    console.log("[API][RESPONSE]", {
      requestId,
      status: 200,
      appointment_id: appointment.id
    });

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
    console.error("[API][FATAL_ERROR]", {
      requestId,
      error: err,
      message: err.message || "Internal server error",
      stack: err.stack
    });
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
