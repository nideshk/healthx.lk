import { requireUser } from "@/lib/authGuard";
import { supabaseClient } from "@/lib/supabaseClient";

export async function GET(req, { params }) {
  try {
    const { authorized, user } = await requireUser(req);
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });


    const { serviceId } = params;

    if (!serviceId) {
      return Response.json({ error: "Service ID is required" }, { status: 400 });
    }

    const { data: practitioners, error } = await supabaseClient
      .from("practitioners")
      .select("*")
      .contains("available_services", [serviceId]);

    if (error) {
      console.error("DB Error:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    const formatted = practitioners.map((p) => ({
      id: p.id,
      full_name: p.full_name,
      contact_number: p.contact_number,
      contact_email: p.contact_email,
      qualification: p.qualification,
      specialization: p.specialization,
      bio: p.profile_bio,
      active: true, // or p.active if you add that column later
      profile_image: p.profile_picture_url,
    }));

    const cnx = getAuditContext(_, user);

    await auditLog({
      ...cnx,
      action: "VIEWED",
      entityType: "SERVICE",
      entityId: serviceId,
      purpose: "operations",
      source: "dashboard",
      metadata: {
        service_id: serviceId,
        practitioners: formatted,
        total: formatted.length,
        user: user.email,
      }
    });

    return Response.json(
      {
        service_id: serviceId,
        practitioners: formatted,
        total: formatted.length,
        user: user.email,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Practitioner by service error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
