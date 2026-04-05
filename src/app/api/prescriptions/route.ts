import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";
import { auditLog } from "@/lib/audit/auditLog";
import { getAuditContext } from "@/lib/audit/getAuditContext";

/**
 * POST /api/prescriptions
 * Body: { encounter_id: string }
 */
export async function POST(request: NextRequest) {
  const { authorized, user } = await requireUser(request);
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { encounter_id } = await request.json();
  if (!encounter_id) return NextResponse.json({ error: "Missing encounter_id" }, { status: 400 });

  try {
    // 1. Verify encounter and practitioner
    const { data: encounter, error: encErr } = await supabaseClient
      .from("encounters")
      .select("id, appointment_id, patient_id, diagnosis")
      .eq("id", encounter_id)
      .single();

    if (encErr || !encounter) return NextResponse.json({ error: "Encounter not found" }, { status: 404 });

    // 2. Fetch appointment to verify practitioner
    const { data: appointment, error: apptErr } = await supabaseClient
      .from("appointments")
      .select("practitioner_id")
      .eq("id", encounter.appointment_id)
      .single();
    
    if (apptErr || !appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    if (appointment.practitioner_id !== user.practitioner_id) {
        return NextResponse.json({ error: "Forbidden: Not your encounter" }, { status: 403 });
    }

    // 3. Create Draft Prescription
    const { data: prescription, error: presErr } = await supabaseClient
      .from("prescriptions")
      .insert({
        encounter_id: encounter.id,
        patient_id: encounter.patient_id,
        practitioner_id: user.practitioner_id,
        diagnosis: encounter.diagnosis || null,
        status: "draft"
      })
      .select()
      .single();

    if (presErr) throw presErr;

    // 4. Update encounter with prescription_id
    await supabaseClient
        .from("encounters")
        .update({ prescription_id: prescription.id })
        .eq("id", encounter.id);

    // 5. Audit Log
    const cnx = getAuditContext(request, user);
    await auditLog({
      ...cnx,
      action: "PRESCRIPTION_CREATED",
      entityType: "PRESCRIPTION",
      entityId: prescription.id,
      metadata: { encounter_id, appointment_id: encounter.appointment_id }
    });

    return NextResponse.json({ prescription }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/prescriptions error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
