import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: prescriptionId } = await context.params;
  const { authorized, user } = await requireUser(request);
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data: prescription, error: presErr } = await supabaseClient
      .from("prescriptions")
      .select("*, items: prescription_items(*)")
      .eq("id", prescriptionId)
      .single();

    if (presErr || !prescription) return NextResponse.json({ error: "Prescription not found" }, { status: 404 });

    // Authorization: practitioner (assigned), patient (assigned), or admin
    const isAdmin = user.role === "admin" || user.role === "superadmin";
    const isPatient = user.patient_id === prescription.patient_id;
    const isPractitioner = user.practitioner_id === prescription.practitioner_id;

    if (!isAdmin && !isPatient && !isPractitioner) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ prescription });
  } catch (error: any) {
    console.error("GET /api/prescriptions/[id] error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: prescriptionId } = await context.params;
  const { authorized, user } = await requireUser(request);
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { diagnosis, special_notes } = body;

  try {
    // 1. Fetch current status
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
        return NextResponse.json({ error: "Cannot edit issued prescription" }, { status: 400 });
    }

    // 4. Update
    const { data: updated, error: updErr } = await supabaseClient
      .from("prescriptions")
      .update({
        diagnosis: diagnosis !== undefined ? diagnosis : undefined,
        special_notes: special_notes !== undefined ? special_notes : undefined,
        updated_at: new Date().toISOString()
      })
      .eq("id", prescriptionId)
      .select()
      .single();

    if (updErr) throw updErr;

    return NextResponse.json({ prescription: updated });
  } catch (error: any) {
    console.error("PATCH /api/prescriptions/[id] error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
