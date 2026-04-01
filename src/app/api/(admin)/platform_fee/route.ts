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
  const { authorized, role, user } = await requireUser(req);
  const cnx = getAuditContext(req, user);

  if (!authorized) {
    await auditLog({
      ...cnx,
      action: "FAILED_ACCESS",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "unauthorized_fetch_appointment_types",
      },
    });

    return NextResponse.json(
      { error: "You are not authorized." },
      { status: 401 }
    );
  }


  const allowedRoles = ["admin", "superadmin"];
  if (!allowedRoles.includes(role)) {
    await auditLog({
      ...cnx,
      action: "FAILED_ACCESS",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "insufficient_role_fetch_appointment_types",
        role,
      },
    });
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
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "failed_to_fetch_appointment_types",
      },
    });
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }

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
  const { authorized, role, user } = await requireUser(req);
  const cnx = getAuditContext(req, user);
  if (!authorized) {
    await auditLog({
      ...cnx,
      action: "FAILED_ACCESS",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "unauthorized_fetch_appointment_types",
      },
    });
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
     await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "missing_name",
      },
    });
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
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "appointment_type_insert_failed",
      },
    });
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
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
  const { authorized, role, user } = await requireUser(req);
  const cnx = getAuditContext(req, user);

  if (!authorized) {
    await auditLog({
      ...cnx,
      action: "FAILED_ACCESS",
      entityType: "ADMIN_USER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: "unauthorized_fetch_appointment_types",
      },
    });
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
      await auditLog({
        ...cnx,
        action: "FAILED",
        entityType: "ADMIN_USER",
        purpose: "operations",
        source: "dashboard",
        metadata: {
          reason: "invalid_updates_array",
        },
      });
    return NextResponse.json(
      { success: false, message: "updates array is required" },
      { status: 400 }
    );
  }

  const results = [];

  for (const item of updatesArray) {
    const { id, name, description, duration_mins, base_fee, max_attendee, extra_fee_per_attendee, platform_fee } =
      item;

    if (!id) {
      await auditLog({
        ...cnx,
        action: "FAILED",
        entityType: "ADMIN_USER",
        purpose: "operations",
        source: "dashboard",
        metadata: {
          reason: "missing_appointment_type_id",
        },
      });
      return NextResponse.json(
        { success: false, message: "Each update must include id" },
        { status: 400 }
      );
    }

    // Build partial update safely
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        await auditLog({
          ...cnx,
          action: "FAILED",
          entityType: "ADMIN_USER",
          entityId: id,
          purpose: "operations",
          source: "dashboard",
          metadata: {
            reason: "invalid_name",
          },
        });
        return NextResponse.json(
          { success: false, message: "Invalid appointment type name" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) updateData.description = description;
    if (duration_mins !== undefined) updateData.duration_mins = duration_mins;
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
      await auditLog({
        ...cnx,
        action: "FAILED",
        entityType: "ADMIN_USER",
        entityId: id,
        purpose: "operations",
        source: "dashboard",
        metadata: {
          reason: "appointment_type_update_failed",
        },
      });
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    results.push(data);
  }

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

export async function DELETE(req: NextRequest) {
  try {
    const { authorized, role, user } = await requireUser(req);
    const cnx = getAuditContext(req, user);
    if (!authorized) {
      await auditLog({
        ...cnx,
        action: "FAILED_ACCESS",
        entityType: "ADMIN_USER",
        purpose: "operations",
        source: "dashboard",
        metadata: {
          reason: "unauthorized_delete_appointment_type",
        },
      });

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["admin", "superadmin"].includes(role)) {
      await auditLog({
        ...cnx,
        action: "FAILED_ACCESS",
        entityType: "ADMIN_USER",
        purpose: "operations",
        source: "dashboard",
        metadata: {
          reason: "insufficient_role_delete_appointment_type",
          role,
        },
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const appointmentTypeId = body?.id;

    if (!appointmentTypeId) {
      await auditLog({
        ...cnx,
        action: "FAILED",
        entityType: "ADMIN_USER",
        purpose: "operations",
        source: "dashboard",
        metadata: {
          reason: "missing_appointment_type_id",
        },
      });
      return NextResponse.json(
        { error: "appointment type id is required" },
        { status: 400 }
      );
    }

    const deletedAt = new Date().toISOString();

    // 1️⃣ Soft delete appointment_type
    const { error: typeError } = await supabaseAdmin
      .from("appointment_type")
      .update({
        is_active: false,
        deleted_at: deletedAt,
        updated_at: deletedAt,
      })
      .eq("id", appointmentTypeId);

    if (typeError) 
      {
        await auditLog({
          ...cnx,
          action: "FAILED",
          entityType: "ADMIN_USER",
          entityId: appointmentTypeId,
          purpose: "operations",
          source: "dashboard",
          metadata: {
            reason: "soft_delete_failed",
          },
        });
        throw typeError;
      }

    // 2️⃣ Remove from practitioners (services + fees)
    await supabaseAdmin.rpc(
      "remove_appointment_type_from_practitioners",
      { type_id: appointmentTypeId }
    );

    await auditLog({
      ...cnx,
      action: "DELETED",
      entityType: "ADMIN_USER",
      entityId: appointmentTypeId,
      purpose: "operations",
      source: "dashboard",
      metadata: {
        event: "soft_deleted",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Appointment type deactivated successfully",
    });
  } catch (err: any) {
    console.error("DELETE /api/platform_fee error:", err);
    return NextResponse.json(
      { error: err.message ?? "Server error" },
      { status: 500 }
    );
  }
}
