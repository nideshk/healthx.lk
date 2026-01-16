import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";
import { calculateAppointmentAmount } from "@/lib/pricing/calculateAppointmentAmount";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ practitionerId: string }> }
) {
  try {
    const { practitionerId } = await context.params;
    const { date, time, appointment_type_id, attendeeList = [] } =
      await req.json();

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

    if (!date || !time || !appointment_type_id || !practitionerId) {
      return NextResponse.json(
        { error: "Missing booking parameters" },
        { status: 400 }
      );
    }

    // ---------------------------
    // 2️⃣ Time normalization
    // ---------------------------
    const starts_at = new Date(`${date}T${time}:00.000Z`).toISOString();

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

    const ends_at = new Date(
      new Date(starts_at).getTime() +
      appointmentType.duration_mins * 60 * 1000
    ).toISOString();

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

    const fees_charged = (consultation_fee_by_practitioner.fee || appointmentType.base_fee) + (appointmentType.platform_fee) + (100 * attendeeList.length);
    const consultation_fee = consultation_fee_by_practitioner.fee || appointmentType.base_fee + appointmentType.platform_fee;
    const platform_fee = appointmentType.platform_fee;
    const tax_amount = fees_charged * 0.08;
    console.log("appointmentType", appointmentType)
    console.log(fees_charged)
    // ---------------------------
    // 6️⃣ Create Appointment
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
      return NextResponse.json(
        { error: "Failed to create appointment" },
        { status: 500 }
      );
    }

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
