import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";


export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: practitionerId } = await ctx.params;
    if (!practitionerId) return NextResponse.json({ error: "Practitioner identifier is required." }, { status: 400 });

    const { authorized, user, role } = await requireUser();
    if (!authorized) return NextResponse.json({ error: "You are not authorized." }, { status: 401 });

    // permissions: practitioner self OR admin OR patient can view
    const canView = (user?.practitioner_id === practitionerId) || role === "admin" || role === "patient";
    if (!canView) {
      return NextResponse.json({ error: "You do not have permission to view this practitioner's pricing." }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("practitioners")
      .select("id, fees")
      .eq("id", practitionerId)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Practitioner not found." }, { status: 404 });

    const cnx = getAuditContext(request, user);

    await auditLog({
      ...cnx,
      action: "VIEWED",
      entityType: "PRACTITIONER",
      entityId: practitionerId,
      purpose: "operations",
      source: "dashboard",
      metadata: {
        practitioner_id: data.id,
        fees: data.fees ?? {}
      }
    })


    return NextResponse.json({
      practitioner_id: data.id,
      fees: data.fees ?? {}
    });
  } catch (err: any) {
    console.error("GET /pricing error:", err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: practitionerId } = await ctx.params;
    if (!practitionerId) return NextResponse.json({ error: "Practitioner identifier is required." }, { status: 400 });

    const { authorized, user } = await requireUser();
    if (!authorized) return NextResponse.json({ error: "You are not authorized." }, { status: 401 });

    // Only the practitioner (own profile) may update pricing
    if (user?.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: "You are not permitted to update this practitioner's pricing." }, { status: 403 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { fees, available_services } = body ?? {};
    if (fees === undefined && available_services === undefined) {
      return NextResponse.json({ error: "Nothing to update. Provide at least one fee field." }, { status: 400 });
    }

    // Validate
    if (available_services !== undefined && !Array.isArray(available_services)) {
      return NextResponse.json({ error: "available_services must be an array." }, { status: 400 });
    }

    // Build update payload: convert empty string to null; keep numeric as-is (supabase will accept numeric strings)
    const payload: any = { updated_at: new Date().toISOString() };
    if (fees !== undefined) payload.fees = fees;
    if (available_services !== undefined) payload.available_services = available_services;

    const { data: updated, error } = await supabaseAdmin
      .from("practitioners")
      .update(payload)
      .eq("id", practitionerId)
      .select("id, fees, available_services")
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!updated) return NextResponse.json({ error: "Practitioner not found." }, { status: 404 });


    const cnx = getAuditContext(request, user);

    await auditLog({
      ...cnx,
      action: "VIEWED",
      entityType: "PRACTITIONER",
      entityId: practitionerId,
      purpose: "operations",
      source: "dashboard",
      metadata: {
        practitioner_id: updated.id,
        fees: updated.fees ?? null,
        available_services: updated.available_services ?? []
      }
    })


    return NextResponse.json({
      practitioner_id: updated.id,
      fees: updated.fees ?? null,
      available_services: updated.available_services ?? []
    }, { status: 200 });
  } catch (err: any) {
    console.error("PATCH /pricing error:", err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
