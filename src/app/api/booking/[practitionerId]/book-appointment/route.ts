import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  context: { params: Promise<{ practitionerId: string }> }
) {
  console.log("▶️ [Booking] Incoming request…");

  try {
    // 0️⃣ Typed Routes params
    const { practitionerId } = await context.params;
    console.log("📌 Practitioner ID:", practitionerId);

    // 1️⃣ User Authentication
    console.log("🔐 Checking user authentication…");
    const { authorized, user } = await requireUser();

    // if (!authorized) {
    //   console.warn("⛔ Unauthorized booking attempt");
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }
   

    // 2️⃣ Parse Body
    console.log("📥 Parsing request body…");
    const body = await req.json();
    const { date, time, appointment_type_id } = body;

    console.log("📌 Inputs received:", { date, time, appointment_type_id });

    if (!date || !time || !appointment_type_id) {
      console.warn("⚠️ Missing required appointment fields");
      return NextResponse.json(
        {
          error:
            "Missing fields. Required: date, time, appointment_type_id",
        },
        { status: 400 }
      );
    }

    const starts_at = `${date}T${time}:00`;
    console.log("🕒 Calculated starts_at:", starts_at);

    // 3️⃣ Fetch appointment type
    console.log("📘 Fetching appointment type:", appointment_type_id);
    const { data: appointmentType, error: typeError } =
      await supabaseClient
        .from("appointment_type")
        .select("duration_mins, name")
        .eq("id", appointment_type_id)
        .single();

    if (typeError || !appointmentType) {
      console.error("❌ Appointment type lookup failed:", typeError);
      return NextResponse.json(
        { error: "Invalid appointment type" },
        { status: 400 }
      );
    }

    console.log("🧩 Appointment type:", appointmentType);

    const { duration_mins } = appointmentType;

    // 4️⃣ Calculate end time
    console.log("⏱️ Calculating end time…");
    const [h, m] = time.split(":").map(Number);
    const startMinutes = h * 60 + m;
    const endMinutes = startMinutes + duration_mins;

    const endH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
    const endM = String(endMinutes % 60).padStart(2, "0");
    const ends_at = `${date}T${endH}:${endM}:00`;

    console.log("🕒 End time:", ends_at);

    // 5️⃣ Check if slot is already booked
    console.log("🔍 Checking if slot is already booked…");
    const { data: existing } = await supabaseClient
      .from("appointments")
      .select("id")
      .eq("practitioner_id", practitionerId)
      .eq("starts_at", starts_at)
      .neq("status", "cancelled")
      .maybeSingle();

    if (existing) {
      console.warn("⛔ Slot already booked:", starts_at);
      return NextResponse.json(
        { error: "Time slot already booked" },
        { status: 409 }
      );
    }

    console.log("✔️ Slot is free");

    // 6️⃣ Create appointment in Supabase
    console.log("📝 Creating appointment record…");
    const { data: inserted, error: insertError } = await supabaseClient
      .from("appointments")
      .insert({
        practitioner_id: practitionerId,
        patient_id: "a7c55cef-78e7-48db-9326-a454b06e7157",
        appointment_type_id,
        starts_at,
        ends_at,
        status: "confirmed",
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Insert failed:", insertError.message);
      return NextResponse.json(
        {
          error: "Database insert failed",
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    console.log("🎉 Successfully inserted appointment:", inserted);


    console.log("✅ Booking completed successfully");
    return NextResponse.json({
      success: true,
      message: "Appointment booked successfully",
      appointment: inserted,
    });
  } catch (err: any) {
    console.error("❌ Booking API Error:", err);
    return NextResponse.json(
      { error: err.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}