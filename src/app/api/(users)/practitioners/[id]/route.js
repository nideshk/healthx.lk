import { requireUser } from "@/lib/authGuard";
import { clinikoFetch } from "@/lib/cliniko";
import { NextResponse } from "next/server";

/**
 * GET /api/practitioners/[id]
 * Fetch practitioner info + available slots (Cliniko-compliant)
 */
export async function GET(req, context) {
  const { authorized, response, user } = await requireUser();
  if (!authorized) return response;

  try {
    const { id } = context.params;
    if (!id)
      return NextResponse.json(
        { error: "Practitioner ID is required" },
        { status: 400 }
      );

    console.log(`👨‍⚕️ Fetching details for practitioner ID: ${id}`);

    // 🔹 Hardcoded configs for MVP
    const BUSINESS_ID = "1725382642183972780";
    const DEFAULT_APPOINTMENT_TYPE = "1725382641949091611";

    // 1️⃣ Fetch core data
    const [practitioner, appointmentTypes, business] = await Promise.all([
      clinikoFetch(`practitioners/${id}`),
      clinikoFetch(`practitioners/${id}/appointment_types`),
      clinikoFetch(`businesses/${BUSINESS_ID}`),
    ]);

    // 2️⃣ Compute Cliniko-safe `from` and `to` (YYYY-MM-DD format)
    const now = new Date();
    const fromDate = new Date(now);
    const toDate = new Date(fromDate);
    toDate.setDate(fromDate.getDate() + 6); // 7-day window total

    const from = fromDate.toISOString().slice(0, 10); // YYYY-MM-DD
    const to = toDate.toISOString().slice(0, 10); // YYYY-MM-DD

    console.log("📅 Using Cliniko-safe dates:", { from, to });

    // 3️⃣ Cliniko availability endpoint (requires just YYYY-MM-DD)
    const endpoint = `businesses/${BUSINESS_ID}/practitioners/${id}/appointment_types/${DEFAULT_APPOINTMENT_TYPE}/available_times?from=${from}&to=${to}`;

    console.log("🔗 Fetching available times:", endpoint);
    const availableTimesData = await clinikoFetch(endpoint);

    // 4️⃣ Group by date
    const availableTimes = availableTimesData?.available_times || [];
    const groupedAvailability = {};

    for (const slot of availableTimes) {
      const slotDate = new Date(slot.appointment_start);
      const dateKey = slotDate.toISOString().slice(0, 10);
      const timeStr = slotDate.toISOString().slice(11, 16);
      if (!groupedAvailability[dateKey]) groupedAvailability[dateKey] = [];
      groupedAvailability[dateKey].push(timeStr);
    }

    // ✅ Final combined response
    return NextResponse.json({
      practitioner: {
        id: practitioner.id,
        name:
          practitioner.display_name ||
          `${practitioner.first_name} ${practitioner.last_name}`,
        title: practitioner.title,
        designation: practitioner.designation,
        description: practitioner.description,
      },
      business: {
        id: business.id,
        name: business.display_name,
        time_zone: business.time_zone,
      },
      appointment_types:
        appointmentTypes?.appointment_types?.map((a) => ({
          id: a.id,
          name: a.name,
          duration: a.duration,
        })) || [],
      availability: {
        range: { from, to },
        total_slots: availableTimes.length,
        grouped: groupedAvailability,
      },
      requested_by: user.email,
      
        userData: user
    });
  } catch (error) {
    console.error("❌ Practitioner fetch failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch practitioner details" },
      { status: 500 }
    );
  }
}
