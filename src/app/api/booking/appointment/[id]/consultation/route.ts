import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { signViewUrl } from "../route";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";
import { processPrescriptionIssuance } from "@/lib/prescription/issueWorkflow";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "@/lib/s3/s3";

const PRESCRIPTION_BUCKET = "clinecxa-prescription-bucket-prod";

async function signPrescriptionUrl(s3KeyOrUrl: string) {
  // Handle old records that stored the full URL instead of just the key
  let s3Key = s3KeyOrUrl;
  if (s3Key.startsWith("https://")) {
    const url = new URL(s3Key);
    s3Key = url.pathname.substring(1); // Remove leading "/"
  }
  const command = new GetObjectCommand({
    Bucket: PRESCRIPTION_BUCKET,
    Key: s3Key,
  });
  return getSignedUrl(s3, command, { expiresIn: 60 * 60 }); // 60 minutes
}

type PrescriptionItem = {
  medicine_name: string;
  strength?: string;
  route?: 'Oral' | 'IV' | 'Local' | 'Suppository' | 'Other';
  duration?: string;
  notes?: string;
};

type PostBody = {
  diagnosis_id?: string | null;   // UUID from diagnoses table
  diagnosis_code?: string | null; // Code from diagnoses table
  diagnosis?: string | null;      // Generic name/string
  diagnosis_description?: string | null; // Description for master table
  
  prescription_items?: PrescriptionItem[];
  special_notes?: string | null;
  status?: 'draft' | 'ready_to_issue' | 'issued';

  // Encounter related (Follow-up only)
  follow_up_needed?: boolean;
  follow_up_date?: string | null;
  followup_notes?: string | null;
};

// GET: return preconsult + encounter + prescription for an appointment
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: appointmentId } = await context.params;

  if (!appointmentId) {
    return NextResponse.json({ error: 'Missing appointment id' }, { status: 400 });
  }
  const { authorized, user, role } = await requireUser(request);
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Fetch appointment basics
    const { data: appointment, error: apptErr } = await supabaseClient
      .from("appointments")
      .select("id, patient_id, practitioner_id, created_at")
      .eq("id", appointmentId)
      .limit(1)
      .maybeSingle();

    if (apptErr) throw apptErr;
    if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    // Authorization check
    const isPatient = user?.patient_id === appointment.patient_id;
    const isPractitioner = user?.practitioner_id === appointment.practitioner_id;
    const isAdmin = role === "admin" || role === "superadmin";

    if (!isPatient && !isPractitioner && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Role-based Masking Logic
    const responseData: any = {};

    // 1. Fetch Consent & Pre-consult
    const { data: consent } = await supabaseClient.from("consents").select("*").eq("appointment_id", appointmentId).maybeSingle();
    responseData.consent = consent;

    if (!isAdmin) {
      const { data: preconsult } = await supabaseClient.from("preconsult_responses").select("*").eq("appointment_id", appointmentId).maybeSingle();
      responseData.preconsult = preconsult;

      if (isPractitioner) {
        const { data: attachments } = await supabaseAdmin.from("attachments").select("*").eq("appointment_id", appointmentId).eq("practitioner_id", user?.practitioner_id);
        if (attachments) {
          responseData.attachments = await Promise.all(attachments.map(async (atc) => ({
            id: atc.id,
            file_name: atc.file_name,
            file_type: atc.file_type,
            view_url: await signViewUrl(atc.file_url),
          })));
        }
      }
    }

    // 2. Fetch Encounter (Follow-up only)
    const { data: encounter } = await supabaseClient.from("encounters").select("id, follow_up_needed, follow_up_date, follow_up_comments, created_at").eq("appointment_id", appointmentId).maybeSingle();
    
    // 3. Fetch Prescription & Items (Directly via appointment_id)
    const { data: prescData } = await supabaseClient
      .from("prescriptions")
      .select("*, diagnoses(*)")
      .eq("appointment_id", appointmentId)
      .maybeSingle();
    
    const prescription = prescData;
    let prescriptionItems = [];
    
    if (prescription && (isPractitioner || isAdmin)) {
      const { data: items } = await supabaseClient.from("prescription_items").select("*").eq("prescription_id", prescription.id);
      prescriptionItems = items || [];
    }

    // Build masked response
    if (isAdmin) {
      responseData.appointment = {
        id: appointment.id,
        created_at: appointment.created_at,
        status: prescription?.status || 'none'
      };
    } else if (isPractitioner) {
      responseData.encounter = encounter;
      responseData.prescription = {
        ...prescription,
        items: prescriptionItems
      };
      if (responseData.prescription) delete responseData.prescription.pdf_url;
    } else if (isPatient) {
      responseData.appointment = {
        id: appointment.id,
        created_at: appointment.created_at,
        issued_at: prescription?.issued_at,
        pdf_url: prescription?.pdf_url ? await signPrescriptionUrl(prescription.pdf_url) : null
      };
    }

    const cnx = getAuditContext(request, user);
    await auditLog({
      ...cnx,
      action: "VIEWED",
      entityType: "CONSULTATION_DATA",
      entityId: appointmentId,
      purpose: "treatment",
      source: isPatient ? "user_portal" : "dashboard",
      metadata: { role }
    });

    return NextResponse.json(responseData, { status: 200 });
  } catch (err: any) {
    console.error("GET /consultation error:", err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

// POST: create or update consultation/prescription
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: appointmentId } = await context.params;
  const { authorized, user } = await requireUser(request);
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: PostBody;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    // 1. Verify Appointment & Practitioner permission
    const { data: appointment, error: apptErr } = await supabaseAdmin
      .from("appointments")
      .select("id, patient_id, practitioner_id, patients(email, full_name)")
      .eq("id", appointmentId)
      .maybeSingle();

    if (apptErr || !appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    if (user?.practitioner_id !== appointment.practitioner_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const patientData: any = appointment.patients;
    const patientName = patientData?.full_name || "Patient";

    // 2. Resolve or Create Diagnosis in Master Table
    let resolvedDiagnosisId = body.diagnosis_id;
    
    if (!resolvedDiagnosisId && (body.diagnosis_code && body.diagnosis)) {
      // Upsert the diagnosis into the master table if we have both code and name
      const { data: upsertedDiag, error: diagErr } = await supabaseAdmin
        .from("diagnoses")
        .upsert({
          code: body.diagnosis_code,
          name: body.diagnosis,
          description: body.diagnosis_description ?? null,
          updated_at: new Date().toISOString()
        }, { onConflict: "code" })
        .select("id")
        .single();
      
      if (diagErr) {
        console.error("DEBUG: Diagnosis upsert failed:", diagErr);
        // We continue anyway but without a resolved ID, or we could throw. 
        // For clinical safety, let's just log it and proceed.
      } else {
        resolvedDiagnosisId = upsertedDiag.id;
      }
    } else if (!resolvedDiagnosisId && body.diagnosis_code) {
      // Just lookup by code if only code is provided
      const { data: found } = await supabaseAdmin.from("diagnoses").select("id").eq("code", body.diagnosis_code).maybeSingle();
      resolvedDiagnosisId = found?.id;
    } else if (!resolvedDiagnosisId && body.diagnosis) {
      // Just lookup by name if only name is provided
      const { data: found } = await supabaseAdmin.from("diagnoses").select("id").ilike("name", body.diagnosis).maybeSingle();
      resolvedDiagnosisId = found?.id;
    }

    // 3. Update Encounter (Follow-up only)
    const encounterRow: any = {
      appointment_id: appointmentId,
      patient_id: appointment.patient_id,
      follow_up_needed: body.follow_up_needed ?? false,
      follow_up_date: body.follow_up_date ? new Date(body.follow_up_date).toISOString() : null,
      follow_up_comments: body.followup_notes ?? null,
      updated_at: new Date().toISOString()
    };

    const { data: existingEnc, error: encFetchErr } = await supabaseClient.from("encounters").select("id").eq("appointment_id", appointmentId).maybeSingle();
    if (encFetchErr) throw encFetchErr;

    let encounterId;
    if (existingEnc) {
      const { error: encUpdErr } = await supabaseClient.from("encounters").update(encounterRow).eq("id", existingEnc.id);
      if (encUpdErr) throw encUpdErr;
      encounterId = existingEnc.id;
    } else {
      const { data: newEnc, error: encInsErr } = await supabaseClient.from("encounters").insert([{ ...encounterRow, created_at: new Date().toISOString() }]).select("id").single();
      if (encInsErr) throw encInsErr;
      encounterId = newEnc?.id;
    }

    // 4. Update Prescription (Linked via appointment_id)
    const validStatuses = ['draft', 'ready_to_issue', 'issued'];
    const validStatus = (validStatuses.includes(body.status || '')) ? body.status : 'draft';
    
    const prescriptionRow: any = {
      appointment_id: appointmentId,
      patient_id: appointment.patient_id,
      practitioner_id: appointment.practitioner_id,
      diagnosis_id: resolvedDiagnosisId ?? null,
      special_notes: body.special_notes ?? null,
      status: validStatus,
      updated_at: new Date().toISOString()
    };

    if (validStatus === 'issued') {
      prescriptionRow.issued_at = new Date().toISOString();
    }

    // Check if prescription exists and verify its status before updating
    const { data: existingPresc, error: prescFetchErr } = await supabaseClient
      .from("prescriptions")
      .select("id, status")
      .eq("appointment_id", appointmentId)
      .maybeSingle();
      
    if (prescFetchErr) throw prescFetchErr;

    // IMMUTABILITY LOCK: Once past 'draft', no further edits allowed
    if (existingPresc && existingPresc.status !== 'draft') {
      return NextResponse.json({ 
        error: `Prescription is already '${existingPresc.status}' and cannot be modified.` 
      }, { status: 400 });
    }

    let prescriptionId;
    if (existingPresc) {
      const { data: updated, error: updErr } = await supabaseClient.from("prescriptions").update(prescriptionRow).eq("id", existingPresc.id).select("id").single();
      if (updErr) throw updErr;
      prescriptionId = updated?.id;
    } else {
      const { data: inserted, error: insErr } = await supabaseClient.from("prescriptions").insert([{ ...prescriptionRow, created_at: new Date().toISOString() }]).select("id").single();
      if (insErr) throw insErr;
      prescriptionId = inserted?.id;
    }

    // 5. Sync Prescription Items
    if (body.prescription_items) {
      const { error: delErr } = await supabaseClient.from("prescription_items").delete().eq("prescription_id", prescriptionId);
      if (delErr) throw delErr;

      if (body.prescription_items.length > 0) {
        const itemsToInsert = body.prescription_items.map(item => ({
          prescription_id: prescriptionId,
          medicine_name: item.medicine_name,
          strength: item.strength,
          route: item.route,
          duration: item.duration,
          notes: item.notes
        }));
        const { error: insItemsErr } = await supabaseClient.from("prescription_items").insert(itemsToInsert);
        if (insItemsErr) throw insItemsErr;
      }
    }

    // 6. Handle Issuance Logic
    if (body.status === 'issued') {
      await processPrescriptionIssuance({
        appointmentId,
        patientEmail: patientData?.email,
        patientName: patientName,
        prescriptionData: {
          diagnosis_id: resolvedDiagnosisId,
          items: body.prescription_items,
          special_notes: body.special_notes
        }
      });
    }

    // Audit Log
    const cnx = getAuditContext(request, user);
    await auditLog({
      ...cnx,
      action: "UPDATED",
      entityType: "PRESCRIPTION",
      entityId: prescriptionId,
      metadata: { status: body.status }
    });

    return NextResponse.json({ success: true, prescriptionId }, { status: 200 });
  } catch (err: any) {
    console.error("POST /consultation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: remove prescription (Only for drafts and only by the assigned practitioner)
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: appointmentId } = await context.params;
  const { authorized, user, role } = await requireUser(request);
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // 1. Verify Appointment & Practitioner permission
    const { data: appointment, error: apptErr } = await supabaseAdmin
      .from("appointments")
      .select("id, practitioner_id")
      .eq("id", appointmentId)
      .maybeSingle();

    if (apptErr || !appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Role check and ownership check
    if (role !== "practitioner" || user?.practitioner_id !== appointment.practitioner_id) {
      return NextResponse.json({ error: "Forbidden: Only the assigned practitioner can delete prescriptions" }, { status: 403 });
    }

    // 2. Fetch the prescription to check its status
    const { data: prescription, error: prescErr } = await supabaseAdmin
      .from("prescriptions")
      .select("id, status")
      .eq("appointment_id", appointmentId)
      .maybeSingle();

    if (prescErr || !prescription) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    // Status check
    if (prescription.status !== 'draft') {
      return NextResponse.json({ 
        error: `Cannot delete prescription with status '${prescription.status}'. Only 'draft' prescriptions can be removed.` 
      }, { status: 400 });
    }

    // 3. Delete items first (just to be safe, depending on DB cascade settings)
    const { error: itemsDelErr } = await supabaseAdmin
      .from("prescription_items")
      .delete()
      .eq("prescription_id", prescription.id);

    if (itemsDelErr) throw itemsDelErr;

    // 4. Delete the prescription
    const { error: finalDelErr } = await supabaseAdmin
      .from("prescriptions")
      .delete()
      .eq("id", prescription.id);

    if (finalDelErr) throw finalDelErr;

    // Audit Log
    const cnx = getAuditContext(request, user);
    await auditLog({
      ...cnx,
      action: "DELETED",
      entityType: "PRESCRIPTION",
      entityId: prescription.id,
      purpose: "treatment",
      source: "dashboard",
      metadata: { appointment_id: appointmentId, original_status: prescription.status }
    });

    return NextResponse.json({ success: true, message: "Draft prescription deleted successfully" }, { status: 200 });
  } catch (err: any) {
    console.error("DELETE /consultation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
