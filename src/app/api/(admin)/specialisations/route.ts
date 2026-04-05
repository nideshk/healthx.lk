import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

/**
 * GET /api/(admin)/specialisations
 * Fetch all specialisations (services) including inactive ones.
 */
export async function GET(req: NextRequest) {
  const { authorized, role, user } = await requireUser(req);
  const cnx = getAuditContext(req, user);

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["admin", "superadmin"];
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("services")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("GET Specialisations Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

/**
 * POST /api/(admin)/specialisations
 * Create a new specialisation.
 */
export async function POST(req: NextRequest) {
  const { authorized, role, user } = await requireUser(req);
  const cnx = getAuditContext(req, user);

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["admin", "superadmin"];
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, slug, description, icon, active, sin_slug, sin_description } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Generate slug if not provided
  const finalSlug = slug || name.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "");

  const { data, error } = await supabaseAdmin
    .from("services")
    .insert({
      name,
      slug: finalSlug,
      description,
      icon,
      active: active ?? true,
      sin_slug,
      sin_description,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error("POST Specialisation Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await auditLog({
    ...cnx,
    action: "CREATED",
    entityType: "SYSTEM_EVENT",
    entityId: data.id,
    purpose: "operations",
    source: "admin_panel",
    metadata: {
      new_service: data,
    }
  });

  return NextResponse.json({ success: true, data });
}

/**
 * PATCH /api/(admin)/specialisations
 * Update an existing specialisation (edit fields or hide/unhide).
 */
export async function PATCH(req: NextRequest) {
  const { authorized, role, user } = await requireUser(req);
  const cnx = getAuditContext(req, user);

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["admin", "superadmin"];
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Specialisation ID is required" }, { status: 400 });
  }

  // Add updated_at timestamp
  const updateData = {
    ...updates,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabaseAdmin
    .from("services")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("PATCH Specialisation Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await auditLog({
    ...cnx,
    action: "UPDATED",
    entityType: "SYSTEM_EVENT",
    entityId: id,
    purpose: "operations",
    source: "admin_panel",
    metadata: {
      updates,
      final_state: data
    }
  });

  return NextResponse.json({ success: true, data });
}
