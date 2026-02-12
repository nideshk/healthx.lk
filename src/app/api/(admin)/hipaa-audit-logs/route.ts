import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

/* ---------------------------------------------------------
   GET HIPAA AUDIT LOGS (ADMIN ONLY)
--------------------------------------------------------- */
export async function GET(req: NextRequest) {
  try {
    /* -----------------------------------------------------
       1️⃣ Auth + role check
    ----------------------------------------------------- */
    const { authorized, user, role } = await requireUser(req);
    if (!authorized) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    if (role !== "admin" && role !== "superadmin") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    /* -----------------------------------------------------
       2️⃣ Query params
    ----------------------------------------------------- */
    const { searchParams } = new URL(req.url);

    const page = Math.max(
      1,
      Number(searchParams.get("page") ?? 1)
    );
    const limit = Math.min(
      100,
      Number(searchParams.get("limit") ?? 25)
    );

    const actorRole = searchParams.get("actor_role");
    const action = searchParams.get("action");
    const entityType = searchParams.get("entity_type");
    const entityId = searchParams.get("entity_id");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const fromIndex = (page - 1) * limit;
    const toIndex = fromIndex + limit - 1;

    /* -----------------------------------------------------
       3️⃣ Build query (explicit filters only)
    ----------------------------------------------------- */
    let query = supabaseAdmin
      .from("hipaa_audit_log")
      .select(
        `
        id,
        occurred_at,
        actor_user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        purpose,
        source,
        request_id,
        metadata,
        ip_address,
        user_agent
      `,
        { count: "exact" }
      )
      .order("occurred_at", { ascending: false })
      .range(fromIndex, toIndex);

    if (actorRole) {
      query = query.eq("actor_role", actorRole);
    }

    if (action) {
      query = query.eq("action", action);
    }

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }

    if (entityId) {
      query = query.eq("entity_id", entityId);
    }

    if (from) {
      query = query.gte("occurred_at", from);
    }

    if (to) {
      query = query.lte("occurred_at", to);
    }

    /* -----------------------------------------------------
       4️⃣ Execute
    ----------------------------------------------------- */
    const { data, error, count } = await query;

    if (error) throw error;

    const cnx = getAuditContext(req, user);

    await auditLog({
      ...cnx,
      action: "VIEWED",
      entityType: "HIPAA_AUDIT_LOG",
      purpose: "compliance",
      source: "admin_panel",
      metadata: {
        filters: { actorRole, action, entityType, entityId, from, to }
      }
    })

    return NextResponse.json({
      success: true,
      page,
      limit,
      total: count ?? 0,
      data,
    });
  } catch (err) {
    console.error("❌ HIPAA audit fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
