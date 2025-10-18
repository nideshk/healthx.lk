// app/api/services/route.js
import { clinikoFetch } from "@/lib/cliniko";
import { requireUser } from "@/lib/authGuard";

export async function GET() {
  try {
      const { authorized, response, user } = await requireUser();

  if (!authorized) return response;

    // Step 1: Fetch all services
    const raw = await clinikoFetch("services?page=1&per_page=50&sort=created_at:desc");

    // Step 2: Enrich with appointment type details
    const services = await Promise.all(
      raw.services.map(async (svc) => {
        const appointmentTypeUrl = svc.appointment_type?.links?.self;
        if (!appointmentTypeUrl) return null;

        try {
          const appointmentType = await clinikoFetch(
            appointmentTypeUrl.replace("https://api.au4.cliniko.com/v1/", "")
          );

          console.log("Fetched appointment type:", appointmentType);
          return {
            id: svc.appointment_type?.links?.self.split("/").pop(),
            name: appointmentType?.name || "Unknown Service",
            description: appointmentType?.description || "",
            duration: appointmentType?.duration_in_minutes || 0,
            price: appointmentType?.deposit_price || "N/A",
          };
        } catch (err) {
          console.error("Failed to fetch appointment type:", err);
          return null;
        }
      })
    );

    return Response.json(
      { services: services.filter(Boolean), total: raw.total_entries, user: user.email },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cliniko /services error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}


