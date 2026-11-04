import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { supabaseClient } from "@/lib/supabaseClient";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

// Same public projection as the batch 1b practitioner routes:
// no license_number, contact details, or available_services.
const PUBLIC_PRACTITIONER_COLUMNS = `
  id,
  full_name,
  qualification,
  specialization,
  profile_bio,
  profile_picture_url
`;

export async function GET(req, context) {
  try {
    const { authorized, user } = await requireUser(req);
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });


    const { serviceId } = await context.params;

    if (!serviceId) {
      return Response.json({ error: "Service ID is required" }, { status: 400 });
    }

    const { data: practitioners, error } = await supabaseClient
      .from("practitioners")
      .select(PUBLIC_PRACTITIONER_COLUMNS)
      .contains("available_services", [serviceId]);

    if (error) {
      console.error("DB Error:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    const formatted = (practitioners || []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      qualification: p.qualification,
      specialization: p.specialization,
      bio: p.profile_bio,
      active: true,
      profile_image: p.profile_picture_url,
    }));

    const cnx = getAuditContext(req, user);

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
