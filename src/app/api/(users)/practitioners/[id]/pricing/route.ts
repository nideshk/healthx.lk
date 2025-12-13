import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";

/**
 * GET  -> view pricing (practitioner self OR admin OR patient)
 * PATCH -> update pricing (ONLY practitioner self)
 *
 * Response (GET):
 * {
 *   practitioner_id: string,
 *   solo_consultation_fee: string | null,   // numeric string from DB (or null)
 *   family_consultation_fee: string | null
 * }
 *
 * PATCH body:
 *{
 *   "fees": {
 *     "c6f80f6b-e66f-4adb-b423-42b034fc568c": { "fee": 1500, "type": "Standard Consultation", "duration_mins": 30, "max_attendees": 1 }
 *   },
 *   "available_services": ["c6f80f6b-e66f-4adb-b423-42b034fc568c"]
 * }
 */

function isUuidLike(s: any) {
  return typeof s === "string" && s.length > 0;
}

function validateFee(value: any) {
  if (value === null || value === undefined || value === "") return true; // allow clearing with null
  // allow number or numeric string; up to 2 decimal places and non-negative
  const s = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return false;
  // numeric check
  const n = Number(s);
  if (!isFinite(n) || n < 0) return false;
  return true;
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
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

    return NextResponse.json({
      practitioner_id: data.id,
      fees: data.fees ?? {}      
    });
  } catch (err: any) {
    console.error("GET /pricing error:", err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
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
    if (fees  === undefined && available_services === undefined) {
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
