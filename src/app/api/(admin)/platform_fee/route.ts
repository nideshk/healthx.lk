import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

/* -------------------------------------------------------------------------- */
/*                                    GET                                     */
/* -------------------------------------------------------------------------- */
/* Fetch all appointment types */

export async function GET(req: NextRequest) {
  const { authorized, role, user } = await requireUser();
  if (!authorized) {
    return NextResponse.json(
    { error: "You are not authorized." },
    { status: 401 }
    );
  }

  const allowedRoles = ["admin", "superadmin"];
    if (!allowedRoles.includes(role)) {
    return NextResponse.json(
        { error: "You do not have permission to view appointments." },
        { status: 403 }
    );
  }
  const { data, error } = await supabaseAdmin
    .from("appointment_type")
    .select(
      `
      id,
      name,
      description,
      duration_mins,
      base_fee,
      max_attendee,
      extra_fee_per_attendee,
      platform_fee
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }

  const cnx = getAuditContext(req, user);
  await auditLog({
    ...cnx,
    action: "VIEWED",
    entityType: "ADMIN_USER",
    purpose: "operations",
    source: "dashboard",
    metadata: {
      success: true,
      data,
    }
  });

  return NextResponse.json({ success: true, data });
}

/* -------------------------------------------------------------------------- */
/*                                   POST                                     */
/* -------------------------------------------------------------------------- */
/* Create new appointment type */

export async function POST(req: NextRequest) {
  const { authorized, role, user } = await requireUser();
  if (!authorized) {
    return NextResponse.json(
    { error: "You are not authorized." },
    { status: 401 }
    );
  }

  const allowedRoles = ["admin", "superadmin"];
  if (!allowedRoles.includes(role)) {
    return NextResponse.json(
        { error: "You do not have permission to view appointments." },
        { status: 403 }
    );
  }
  const body = await req.json();

  const {
    name,
    description,
    duration_mins,
    base_fee,
    max_attendee,
    extra_fee_per_attendee,
    platform_fee,
  } = body;

  if (!name) {
    return NextResponse.json(
      { success: false, message: "Name is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("appointment_type")
    .insert({
      name,
      description,
      duration_mins,
      base_fee,
      max_attendee,
      extra_fee_per_attendee,
      platform_fee,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
    const cnx = getAuditContext(req, user);
  await auditLog({
    ...cnx,
    action: "CREATED",
    entityType: "ADMIN_USER",
    purpose: "operations",
    source: "dashboard",
    metadata: {
      success: true,
      data,
    }
  });


  return NextResponse.json({ success: true, data });
}

/* -------------------------------------------------------------------------- */
/*                                    PUT                                     */
/* -------------------------------------------------------------------------- */
/* Update pricing fields ONLY */

export async function PUT(req: NextRequest) {
  const { authorized, role, user } = await requireUser();
  if (!authorized) {
    return NextResponse.json(
    { error: "You are not authorized." },
    { status: 401 }
    );
  }

  const allowedRoles = ["admin", "superadmin"];
  if (!allowedRoles.includes(role)) {
    return NextResponse.json(
        { error: "You do not have permission to view appointments." },
        { status: 403 }
    );
  }
    const body = await req.json();
  const updatesArray = body?.updates;

  if (!Array.isArray(updatesArray) || updatesArray.length === 0) {
    return NextResponse.json(
      { success: false, message: "updates array is required" },
      { status: 400 }
    );
  }

  const results = [];

  for (const item of updatesArray) {
    const { id, base_fee, max_attendee, extra_fee_per_attendee, platform_fee } =
      item;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Each update must include id" },
        { status: 400 }
      );
    }

    // Build partial update safely
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (base_fee !== undefined) updateData.base_fee = base_fee;
    if (max_attendee !== undefined) updateData.max_attendee = max_attendee;
    if (extra_fee_per_attendee !== undefined)
      updateData.extra_fee_per_attendee = extra_fee_per_attendee;
    if (platform_fee !== undefined)
      updateData.platform_fee = platform_fee;

    if (Object.keys(updateData).length === 1) {
      continue; // nothing to update
    }

    const { data, error } = await supabaseAdmin
      .from("appointment_type")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    results.push(data);
  }

    const cnx = getAuditContext(req, user);
  await auditLog({
    ...cnx,
    action: "UPDATED",
    entityType: "ADMIN_USER",
    purpose: "operations",
    source: "dashboard",
    metadata: {
      success: true,
      data: results,
    }
  });

  return NextResponse.json({
    success: true,
    updated: results.length,
    data: results,
  });
}
