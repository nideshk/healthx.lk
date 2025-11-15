import { NextResponse } from "next/server";
import { DateTime } from "luxon";

export const runtime = "nodejs";

/**
 * GET /api/practitioners/[id]/booked?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Fetch all booked appointments for a practitioner within a date range.
 * Converts UTC -> local timezone (Asia/Colombo)
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ⬅️ Typed routes requires awaiting this
    const { id: practitionerId } = await context.params;

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing from/to query params" },
        { status: 400 }
      );
    }

    const region = process.env.CLINIKO_REGION || "au1";
    const apiKey = process.env.CLINIKO_API_KEY;
    const authHeader = "Basic " + Buffer.from(apiKey + ":").toString("base64");
    const userAgent = `${process.env.CLINIKO_APP_NAME} (${process.env.CLINIKO_APP_EMAIL})`;
    const TIMEZONE = "Asia/Colombo";

    console.log(
      `📅 Fetching booked slots for practitioner: ${practitionerId} (${from} → ${to})`
    );

    // 📌 Recursive pagination fetch
    async function fetchAllAppointments(page = 1, allData: any[] = []): Promise<any[]> {
      const url = `https://api.${region}.cliniko.com/v1/appointments?from=${from}&to=${to}&page=${page}&per_page=50`;
      const res = await fetch(url, {
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
          "User-Agent": userAgent,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(`Cliniko API error: ${res.status} ${JSON.stringify(data)}`);
      }

      const combined = allData.concat(data.appointments || []);
      if (data.total_entries > combined.length) {
        return fetchAllAppointments(page + 1, combined);
      }
      return combined;
    }

    const allAppointments = await fetchAllAppointments();

    // 🔎 Filter by practitioner + date range
    const filtered = allAppointments.filter((a: any) => {
      const practitionerUrl = a.practitioner?.links?.self;
      const practitionerIdFromLink = practitionerUrl?.split("/").pop();
      const appointmentDate = a.appointment_start.slice(0, 10);

      return (
        practitionerIdFromLink === practitionerId &&
        appointmentDate >= from &&
        appointmentDate <= to
      );
    });

    // ⏱️ Convert UTC → Local
    const booked = filtered.map((a: any) => {
      const startUTC = DateTime.fromISO(a.appointment_start, { zone: "utc" });
      const endUTC = DateTime.fromISO(a.appointment_end, { zone: "utc" });

      const startLocal = startUTC.setZone(TIMEZONE);
      const endLocal = endUTC.setZone(TIMEZONE);

      return {
        from: startLocal.toFormat("HH:mm"),
        to: endLocal.toFormat("HH:mm"),
        date: startLocal.toFormat("yyyy-MM-dd"),
        patient_name: a.patient_name,
        appointment_type: a.appointment_type?.links?.self?.split("/")?.pop(),
      };
    });

    // 📅 Group by date
    const grouped = booked.reduce((acc: any, b: any) => {
      if (!acc[b.date]) acc[b.date] = [];
      acc[b.date].push({
        from: b.from,
        to: b.to,
        appointment_type: b.appointment_type,
      });
      return acc;
    }, {});

    console.log(
      `✅ Found ${booked.length} booked slots for practitioner ${practitionerId}`
    );

    return NextResponse.json({
      success: true,
      total: booked.length,
      practitioner_id: practitionerId,
      range: { from, to },
      timezone: TIMEZONE,
      booked,
      grouped,
    });
  } catch (error: any) {
    console.error("❌ Cliniko Fetch Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
