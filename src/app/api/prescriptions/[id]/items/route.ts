import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";

/**
 * POST /api/prescriptions/[id]/items
 * Body: { items: Array<{ medicine_name, strength, route, duration, notes }> }
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: prescriptionId } = await context.params;
  const { authorized, user } = await requireUser(request);
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { items } = body;

  if (!Array.isArray(items)) return NextResponse.json({ error: "Items must be an array" }, { status: 400 });

  try {
    // 1. Fetch current status and practitioner
    const { data: prescription, error: presErr } = await supabaseClient
      .from("prescriptions")
      .select("status, practitioner_id")
      .eq("id", prescriptionId)
      .single();

    if (presErr || !prescription) return NextResponse.json({ error: "Prescription not found" }, { status: 404 });

    // 2. Authorization
    if (prescription.practitioner_id !== user.practitioner_id) {
        return NextResponse.json({ error: "Forbidden: Not your prescription" }, { status: 403 });
    }

    // 3. Status Check (Lock editing if issued)
    if (prescription.status === "issued") {
        return NextResponse.json({ error: "Cannot edit issued prescription items" }, { status: 400 });
    }

    // 4. Sync Items: Delete all and re-insert
    // Best practice for "editing" a list of items is often replacement.
    const { error: delErr } = await supabaseClient
      .from("prescription_items")
      .delete()
      .eq("prescription_id", prescriptionId);

    if (delErr) throw delErr;

    if (items.length > 0) {
      const { data: insertedItems, error: insErr } = await supabaseClient
        .from("prescription_items")
        .insert(items.map((item: any) => ({
          ...item,
          prescription_id: prescriptionId
        })))
        .select();

      if (insErr) throw insErr;
      return NextResponse.json({ items: insertedItems });
    }

    return NextResponse.json({ items: [] });
  } catch (error: any) {
    console.error("POST /api/prescriptions/[id]/items error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
