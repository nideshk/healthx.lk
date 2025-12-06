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
 * {
 *   solo_consultation_fee?: number|string|null,
 *   family_consultation_fee?: number|string|null
 * }
 */

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
      .select("id, solo_consultation_fee, family_consultation_fee")
      .eq("id", practitionerId)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Practitioner not found." }, { status: 404 });

    return NextResponse.json({
      practitioner_id: data.id,
      solo_consultation_fee: data.solo_consultation_fee === null ? null : String(data.solo_consultation_fee),
      family_consultation_fee: data.family_consultation_fee === null ? null : String(data.family_consultation_fee),
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

    const { solo_consultation_fee, family_consultation_fee } = body ?? {};

    if (solo_consultation_fee === undefined && family_consultation_fee === undefined) {
      return NextResponse.json({ error: "Nothing to update. Provide at least one fee field." }, { status: 400 });
    }

    // Validate
    if (solo_consultation_fee !== undefined && !validateFee(solo_consultation_fee)) {
      return NextResponse.json({ error: "solo_consultation_fee must be a non-negative number with up to 2 decimal places." }, { status: 400 });
    }
    if (family_consultation_fee !== undefined && !validateFee(family_consultation_fee)) {
      return NextResponse.json({ error: "family_consultation_fee must be a non-negative number with up to 2 decimal places." }, { status: 400 });
    }

    // Build update payload: convert empty string to null; keep numeric as-is (supabase will accept numeric strings)
    const payload: any = {};
    if (solo_consultation_fee !== undefined) payload.solo_consultation_fee = solo_consultation_fee === "" ? null : solo_consultation_fee;
    if (family_consultation_fee !== undefined) payload.family_consultation_fee = family_consultation_fee === "" ? null : family_consultation_fee;
    payload.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin
      .from("practitioners")
      .update(payload)
      .eq("id", practitionerId)
      .select("id, solo_consultation_fee, family_consultation_fee")
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!updated) return NextResponse.json({ error: "Practitioner not found." }, { status: 404 });

    return NextResponse.json({
      practitioner_id: updated.id,
      solo_consultation_fee: updated.solo_consultation_fee === null ? null : String(updated.solo_consultation_fee),
      family_consultation_fee: updated.family_consultation_fee === null ? null : String(updated.family_consultation_fee),
    });
  } catch (err: any) {
    console.error("PATCH /pricing error:", err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
