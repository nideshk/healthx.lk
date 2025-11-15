import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const apiKey = process.env.CLINIKO_API_KEY!;
    const region = process.env.CLINIKO_REGION || "au1";
    const userAgent = `${process.env.CLINIKO_APP_NAME || "Medx"} (${
      process.env.CLINIKO_APP_EMAIL || "admin@medx.app"
    })`;

    const authHeader = "Basic " + Buffer.from(apiKey + ":").toString("base64");
    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q") || "";
    const perPage = Number(searchParams.get("per_page")) || 50;
    const order = searchParams.get("order") || "asc";
    const sort = searchParams.get("sort") || "created_at:desc";

    console.log("📡 Fetching Cliniko Bookings...");

    async function fetchAllBookings(page = 1, allData: any[] = []): Promise<any[]> {
      const url = `https://api.${region}.cliniko.com/v1/bookings?page=${page}&per_page=${perPage}&order=${order}&sort=${encodeURIComponent(sort)}${
        q ? `&q[]=${encodeURIComponent(q)}` : ""
      }`;

      const res = await fetch(url, {
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
          "User-Agent": userAgent,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(`Cliniko API error: ${res.status} ${JSON.stringify(data)}`);

      const combined = allData.concat(data.bookings || []);

      // Cliniko gives `total_entries` so we can stop when done
      if (data.total_entries > combined.length) {
        return fetchAllBookings(page + 1, combined);
      }

      return combined;
    }

    const allBookings = await fetchAllBookings();

    console.log(`✅ Retrieved ${allBookings.length} bookings from Cliniko`);

    return NextResponse.json({
      success: true,
      total: allBookings.length,
      data: allBookings,
    });
  } catch (error: any) {
    console.error("❌ Cliniko Bookings Fetch Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
