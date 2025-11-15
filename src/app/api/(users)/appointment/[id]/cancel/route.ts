import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  console.log("▶️ Cancelling Cliniko appointment...");

  try {
    const { id: appointment_id } = await context.params;

    if (!appointment_id) {
      return NextResponse.json(
        { error: "Missing appointment_id" },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // 🧩 1️⃣ Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("👤 Logged in user:", user.id);

    // 🧩 2️⃣ Verify ownership via your mirrored DB
    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("id, supabase_user_id, cliniko_appointment_id")
      .eq("cliniko_appointment_id", appointment_id)
      .maybeSingle();

    if (fetchError) {
      console.error("❌ Error fetching appointment:", fetchError.message);
      return NextResponse.json(
        { error: "Database error verifying appointment" },
        { status: 500 }
      );
    }

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    if (appointment.supabase_user_id !== user.id) {
      return NextResponse.json(
        { error: "You are not allowed to cancel this appointment" },
        { status: 403 }
      );
    }

    // 🧩 3️⃣ Parse request body
    const { cancellation_note, cancellation_reason, apply_to_repeats } =
      await req.json();

    if (!cancellation_reason) {
      return NextResponse.json(
        { error: "Missing cancellation_reason" },
        { status: 400 }
      );
    }

    // 🔐 4️⃣ Cliniko API setup
    const apiKey = process.env.CLINIKO_API_KEY!;
    const region = process.env.CLINIKO_REGION || "au1";

    const authHeader = "Basic " + Buffer.from(apiKey + ":").toString("base64");
    const userAgent = `${process.env.CLINIKO_APP_NAME || "Medx"} (${
      process.env.CLINIKO_APP_EMAIL || "admin@medx.app"
    })`;

    const url = `https://api.${region}.cliniko.com/v1/individual_appointments/${appointment_id}/cancel`;

    console.log("📡 Cancelling appointment at:", url);

    // 🧩 5️⃣ Send cancel request to Cliniko
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": userAgent,
      },
      body: JSON.stringify({
        cancellation_note: cancellation_note || "Cancelled via Medx portal",
        cancellation_reason,
        apply_to_repeats: apply_to_repeats ?? false,
      }),
    });

    if (res.status === 204) {
      console.log(`✅ Appointment ${appointment_id} cancelled successfully`);

      await supabase
        .from("appointments")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("cliniko_appointment_id", appointment_id);

      return NextResponse.json({
        message: `Appointment ${appointment_id} cancelled successfully`,
      });
    }

    const errorText = await res.text();
    console.error("❌ Cliniko API error:", res.status, errorText);

    return NextResponse.json(
      {
        error: "Cliniko API failed",
        status: res.status,
        details: errorText,
      },
      { status: res.status }
    );
  } catch (err: any) {
    console.error("❌ Unexpected error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
