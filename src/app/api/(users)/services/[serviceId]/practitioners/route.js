import { clinikoFetch } from "@/lib/cliniko";
import { requireUser } from "@/lib/authGuard";

export async function GET(_, { params }) {
  try {
      const { authorized, response, user } = await requireUser();

  if (!authorized) return response;

    const { serviceId } = params;

    if (!serviceId) {
      return Response.json({ error: "Service ID is required" }, { status: 400 });
    }

    // Fetch practitioners for this appointment type (service)
    const raw = await clinikoFetch(
      `appointment_types/${serviceId}/practitioners?page=1&per_page=50`
    );

    // Clean up the data
    const practitioners = await Promise.all(
      raw.practitioners.map(async (doc) => {
        try {
          const full = await clinikoFetch(
            `practitioners/${doc.id}`
          );

          return {
            id: full.id,
            first_name: full.first_name,
            last_name: full.last_name,
            email: full.email,
            phone: full.phone,
            bio: full.bio || "",
            active: full.active,
            business_links: full.businesses?.map(
              (b) => b.links?.self || ""
            ),
            links: {
              self: `https://api.au4.cliniko.com/v1/practitioners/${full.id}`,
            },
          };
        } catch (err) {
          console.error("Error fetching practitioner details:", err);
          return null;
        }
      })
    );

    return Response.json(
      {
        service_id: serviceId,
        practitioners: practitioners.filter(Boolean),
        total: raw.total_entries || practitioners.length,
        user : user.email,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cliniko practitioners error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
