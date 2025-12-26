import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";
import { sendNotification } from "@/lib/notifications/sendNotification";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  context: { params: Promise<{ practitionerId: string }> }
) {
  try {
    const { practitionerId } = await context.params;

    // 1️⃣ Auth
    const { authorized, user } = await requireUser();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patient_id = user?.patient_id;
    if (!patient_id) {
      return NextResponse.json(
        { error: "No patient record linked to this account" },
        { status: 400 }
      );
    }

    // 2️⃣ Load Draft
    const { data: draft, error: draftError } = await supabaseClient
      .from("appointment_draft")
      .select("data")
      .eq("patient_id", patient_id)
      .single();

    if (draftError || !draft?.data) {
      return NextResponse.json(
        { error: "No appointment draft found" },
        { status: 404 }
      );
    }

    const draftData = draft.data;

    const {
      starts_at,
      ends_at,
      appointmentType,
      pre_consultation,
      selectedDoctor,
      attendeeCount,
      consent
    } = draftData;

    // 3️⃣ Validate
    if (!starts_at || !ends_at || !appointmentType?.id || !selectedDoctor?.id) {
      return NextResponse.json(
        {
          error: "Draft is incomplete",
          missing: {
            starts_at,
            ends_at,
            appointmentType,
            selectedDoctor,
          },
        },
        { status: 400 }
      );
    }

    // 4️⃣ Check Conflicts
    const { data: existing } = await supabaseClient
      .from("appointments")
      .select("id")
      .eq("practitioner_id", practitionerId)
      .eq("starts_at", starts_at)
      .neq("status", "cancelled")
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "This time slot is already booked" },
        { status: 409 }
      );
    }

    let resolvedFee: number | null = null;
    let consultationFee!: number;
    let platformFee!: number;
    let serviceFee: number;
    let tax: number;

    // 1️⃣ Fetch practitioner fees JSON
    const { data: practitionerRow, error: feeErr } = await supabaseClient
      .from("practitioners")
      .select("fees")
      .eq("id", practitionerId)
      .single();

    if (feeErr || !practitionerRow) {
      return NextResponse.json(
        { error: "Unable to fetch practitioner's pricing details." },
        { status: 500 }
      );
    }

    const practitionerFeeEntry =
      practitionerRow.fees?.[appointmentType.id];

    // 2️⃣ If practitioner fee exists → use it
    if (practitionerFeeEntry) {
      consultationFee = Number(practitionerFeeEntry.fee);
      platformFee = Number(practitionerFeeEntry.platform_fee);
    }

    // 3️⃣ Fallback: fetch from appointment_type
    if (
      !Number.isFinite(consultationFee) ||
      !Number.isFinite(platformFee)
    ) {
      const { data: typeRow, error: typeErr } = await supabaseClient
        .from("appointment_type")
        .select("base_fee, platform_fee")
        .eq("id", appointmentType.id)
        .single();

      if (typeErr || !typeRow) {
        return NextResponse.json(
          {
            error: "Fee configuration missing",
            message:
              "Neither practitioner nor appointment type has valid pricing configured.",
          },
          { status: 400 }
        );
      }

      consultationFee = Number(typeRow.base_fee);
      platformFee = Number(typeRow.platform_fee);
    }

    serviceFee = Math.round(consultationFee * 0.05);
    tax = Math.round((consultationFee + serviceFee) * 0.08);

    // 4️⃣ Final validation
    if (
      !Number.isFinite(consultationFee) ||
      consultationFee < 0 ||
      !Number.isFinite(platformFee) ||
      platformFee < 0 ||
      !Number.isFinite(serviceFee) ||
      serviceFee < 0 ||
      !Number.isFinite(tax) ||
      tax < 0
    ) {
      return NextResponse.json(
        {
          error: "Invalid fee configuration",
          message:
            "Resolved fee values are invalid. Please contact support.",
        },
        { status: 400 }
      );
    }

    // 5️⃣ Final resolved fee
    resolvedFee = consultationFee + platformFee + serviceFee + tax;

    // 6 Insert Appointment
    const { data: appointment, error: insertError } = await supabaseClient
      .from("appointments")
      .insert({
        practitioner_id: practitionerId,
        patient_id,
        appointment_type_id: appointmentType.id,
        starts_at,
        ends_at,
        status: "scheduled", // Changing this from confirmed to pending payment, will update this to confirm once the payment is received
        notes: pre_consultation?.note?.concern || null,
        source: "web",

        // 🟦 NEW — STORE HISTORICAL PRICING
        fee_charged: resolvedFee,
        currency: selectedDoctor.currency ?? "LKR",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Database insert failed", details: insertError.message },
        { status: 500 }
      );
    }

    // 7 Save Pre-Consultation Responses
    if (pre_consultation) {
      await supabaseClient.from("preconsult_responses").insert({
        appointment_id: appointment.id,
        patient_id,
        raw_payload: pre_consultation,
      });
    }

    if (consent) {
    if (consent) {
      await supabaseClient.from("consents").insert({
        appointment_id: appointment.id,
        terms: consent?.terms,
        telehealth: consent?.telehealth,
        accepted_at: new Date().toISOString()
        accepted_at: new Date().toISOString()
      })
    }

    // ---------------------------
    // 8 Prepare payment payload (backend derived)
    // ---------------------------
    const paymentPayload = {
      appointment_id: appointment.id,
      patient_id,
      practitioner_id: practitionerId,
      city: user.patient_data.city,
      country: user.patient_data.country,
      address: user.patient_data.address,
      appointment_type_id: appointmentType.id,
      amount: resolvedFee,
      consultation_fee: consultationFee,
      platform_fee: platformFee,
      first_name: user.profile.first_name,
      last_name: user.profile.last_name,
      consultation_fee: consultationFee, // Added this column to transactions table
      platform_fee: platformFee, // Added this column to transactions table

      currency: appointment.currency ?? "LKR",
      source: "appointment_booking",
      status: "INITIATED",

      // Change thes to real value from API later
      first_name: "Dummy first name",
      last_name: "Dummy lat name",
      email: "dummyemail@email.com",
      phone: "0000",
      metadata: {
        starts_at,
        ends_at,
      },
    };


    // 8️⃣ Send appointment confirmation notification
    await notify({
      userId: user.auth_user_id, // auth.users.id
      role: "patient",
      eventType: "appointment_confirmed",

      title: "Appointment Confirmed",
      message: `Your appointment is confirmed on ${new Date(starts_at).toLocaleString()}`,

      channels: ["in_app", "email"],

      payload: {
        // -------- Common --------
        appointment_id: appointment.id,
        practitioner_id: practitionerId,
        starts_at,
        ends_at,

        // -------- Email --------
        email: user.user.email,
        recipientName:
          user.profile?.full_name ||
          user.user.user_metadata?.full_name,

        subject: "Your appointment is confirmed",
        actionUrl: `https://medx-rho.vercel.app/consultation/meeting?room=${appointment.room_key}`,
        actionText: "Join Meeting",

        // -------- SMS --------
        phone: "+917899416499",
      },
    });

    // 9 Mark Draft as Used (best-effort, non-critical)
    try {
      await supabaseClient
        .from("appointment_draft")
        .delete()
        .eq("patient_id", patient_id);
    } catch (draftErr) {
      console.error("⚠️ Failed to delete appointment draft:", draftErr);
      // Do not rethrow: draft cleanup failure should not break a successful booking
    }
    // 9 Mark Draft as Used
    await supabaseClient
      .from("appointment_draft")
      .update({ status: "USED", updated_at: new Date().toISOString() })
      .eq("patient_id", patient_id);

    // Removed notify part from here as we'll send notifications from the payhere webhook once the payment is confirmed and verified.

    return NextResponse.json({
      success: true,
      // Changing message
      message: "Appointment initiated, payment pending.",
      appointment,
      paymentPayload
    });
  } catch (err: any) {
    console.error("❌ Booking Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}