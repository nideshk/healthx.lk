import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { signViewUrl } from "../route";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

type PostBody = {
  clinician_notes?: string | null;
  prescriptions?: string | object | null; // will be stored as text; objects will be JSON.stringified
  follow_up_needed?: boolean;
  follow_up_date?: string | null; // ISO date string or null
};

// GET: return preconsult + encounter for an appointment
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: appointmentId } = await context.params;

  if (!appointmentId) {
    return NextResponse.json({ error: 'Missing appointment id' }, { status: 400 });
  }
  const { authorized, user, role } = await requireUser(request);
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    // Fetch appointment (minimal)
    const { data: appointment, error: apptErr } = await supabaseClient
      .from("appointments")
      .select("id, patient_id, practitioner_id")
      .eq("id", appointmentId)
      .limit(1)
      .maybeSingle();

    if (apptErr) throw apptErr;
    if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    // Authorization: patient, assigned practitioner, or admin/support
    debugger;
    const isPatient = user?.patient_id === appointment.patient_id;
    const isPractitioner = user?.practitioner_id === appointment.practitioner_id;
    const isAdmin = role === "admin";

    if (!isPatient && !isPractitioner && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data: consent, error: conErr } = await supabaseClient
      .from("consents")
      .select("id, telehealth, terms, accepted_at")
      .eq("appointment_id", appointmentId)
      .limit(1)
      .maybeSingle();
    if (conErr) throw conErr;

    if (isAdmin) {
      return NextResponse.json({ consent: consent ?? null }, { status: 200 });
    }
    // Fetch preconsult_responses (one row per appointment)
    const { data: preconsult, error: preErr } = await supabaseClient
      .from("preconsult_responses")
      .select("id, patient_id, raw_payload, created_at, updated_at")
      .eq("appointment_id", appointmentId)
      .limit(1)
      .maybeSingle();
    if (preErr) throw preErr;


    let attachments: any[] = [];

    const { data } = await supabaseAdmin
      .from("attachments")
      .select(
        `
          *
        `
      )
      .eq("appointment_id", appointmentId)
      .eq("practitioner_id", user?.practitioner_id);
    console.log("Fetched attachments (practitioner):", data);
    attachments = data ?? [];


    const signedAttachments = await Promise.all(
      attachments.map(async (atc) => ({
        id: atc.id,
        file_name: atc.file_name,
        file_type: atc.file_type,
        file_size: atc.file_size,
        created_at: atc.created_at,
        view_url: await signViewUrl(atc.file_url),
      }))
    );

    // Fetch encounter (assumes one encounter per appointment)
    const { data: encounter, error: encErr } = await supabaseClient
      .from("encounters")
      .select("id, clinician_notes, prescriptions, follow_up_needed, follow_up_date, created_at, updated_at")
      .eq("appointment_id", appointmentId)
      .limit(1)
      .maybeSingle();
    if (encErr) throw encErr;


    const cnx = getAuditContext(request, user);

    await auditLog({
      ...cnx,
      action: "VIEWED",
      entityType: "CONSULTATION_DATA",
      entityId: appointmentId,
      purpose: "treatment",
      source: isPatient ? "user_portal" : "dashboard",
      metadata: { appointment_id: appointmentId }
    })

    return NextResponse.json({ consent: consent ?? null, preconsult: preconsult ?? null, encounter: encounter ?? null, attachments: signedAttachments ?? [] }, { status: 200 });
  } catch (err: any) {
    console.error("GET /consultation error:", err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

// POST: create or update encounter for the appointment
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  //   const appointmentId = params?.id;
  //   if (!appointmentId) return NextResponse.json({ error: "Missing appointment id" }, { status: 400 });

  const { id: appointmentId } = await context.params;

  if (!appointmentId) {
    return NextResponse.json({ error: 'Missing appointment id' }, { status: 400 });
  }



  const { authorized, user, role } = await requireUser(request);
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    // verify appointment and writer permission
    const { data: appointment, error: apptErr } = await supabaseClient
      .from("appointments")
      .select("id, practitioner_id")
      .eq("id", appointmentId)
      .limit(1)
      .maybeSingle();

    if (apptErr) throw apptErr;
    if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    const isPractitioner = user?.practitioner_id === appointment.practitioner_id;
    // IMPORTANT: admins are NOT allowed to write as per requirement
    if (!isPractitioner) {
      return NextResponse.json({ error: "Forbidden: only the appointment practitioner can save consultation" }, { status: 403 });
    }

    // prepare values; store prescriptions as text:
    let prescriptionsText: string | null = null;
    if (body.prescriptions == null) {
      prescriptionsText = null;
    } else if (typeof body.prescriptions === "string") {
      prescriptionsText = body.prescriptions;
    } else {
      // object/array — stringify for text column
      prescriptionsText = JSON.stringify(body.prescriptions);
    }

    const followUpTimestamp =
      body.follow_up_date ? new Date(body.follow_up_date).toISOString() : null;

    const row = {
      appointment_id: appointmentId,
      clinician_notes: body.clinician_notes ?? null,
      prescriptions: prescriptionsText,
      follow_up_needed: body.follow_up_needed ?? false,
      follow_up_date: followUpTimestamp,
      updated_at: new Date().toISOString()
    };

    // check existing encounter
    const { data: existing, error: exErr } = await supabaseClient
      .from("encounters")
      .select("id")
      .eq("appointment_id", appointmentId)
      .limit(1)
      .maybeSingle();
    if (exErr) throw exErr;

    if (!existing) {
      // insert
      const { data: inserted, error: insertErr } = await supabaseClient
        .from("encounters")
        .insert([{ ...row, created_at: new Date().toISOString() }])
        .select()
        .single();
      if (insertErr) throw insertErr;
      return NextResponse.json({ encounter: inserted }, { status: 201 });
    } else {
      // update
      const { data: updated, error: updErr } = await supabaseClient
        .from("encounters")
        .update(row)
        .eq("id", existing.id)
        .select()
        .single();
      if (updErr) throw updErr;
      return NextResponse.json({ encounter: updated }, { status: 200 });
    }
  } catch (err: any) {
    console.error("POST /consultation error:", err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
