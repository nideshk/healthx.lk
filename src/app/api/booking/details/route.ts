import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

export async function GET(request: NextRequest) {
  try {
    const { authorized, user } = await requireUser(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const cnx = getAuditContext(request, user);
    if (!authorized || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the appoiontment details
    const { data: appt, error: apptError } = await supabaseAdmin
      .from("appointments")
      .select(`
        id,
        starts_at,
        consultation_fee,
        platform_fee,
        patient_id,
        practitioner_id,
        appointment_type_id,
        fee_charged
      `)
      .eq("id", id)
      .maybeSingle();

    if (apptError) throw new Error(apptError.message);
    if (!appt) {
      return NextResponse.json({ error: `Appointment ${id} not found in DB.` }, { status: 404 });
    }

    // Fetch the related data separately
    const [patientRes, practitionerRes, typeRes, consentsRes, preConsultRes] = await Promise.all([
      supabaseAdmin.from("patients").select("full_name, email, contact_number, address").eq("id", appt.patient_id).maybeSingle(),
      supabaseAdmin.from("practitioners").select("id, full_name, profile_bio, specialization").eq("id", appt.practitioner_id).maybeSingle(),
      supabaseAdmin.from("appointment_type").select("id, name, base_fee, duration_mins").eq("id", appt.appointment_type_id).maybeSingle(),
      supabaseAdmin.from("consents").select('telehealth, terms').eq('appointment_id', appt.id),
      supabaseAdmin.from("preconsult_responses").select('raw_payload').eq('appointment_id', appt.id).maybeSingle()
    ]);

    const formattedData = {
      selectedDoctor: practitionerRes.data,
      appointmentType: typeRes.data,
      starts_at: appt.starts_at,
      fullName: patientRes.data?.full_name,
      email: patientRes.data?.email,
      phone: patientRes.data?.contact_number,
      fee_charged: appt?.fee_charged,
      address: patientRes.data?.address,
      selectedService: { name: "Medical Consultation" },
      consents: consentsRes.data,
      consultation_fee: appt?.consultation_fee,
      platform_fee: appt?.platform_fee,
      selectedAttendees: [],
      pre_consultation: preConsultRes.data?.raw_payload ?? null
    };

    await auditLog({
      ...cnx,
      action: "VIEWED",
      entityType: "APPOINTMENT_DETAILS",
      entityId: appt.id,
      purpose: "operations",
      source: "user_portal",
      metadata: { appointment_id: appt.id }
    })

    return NextResponse.json(formattedData);
  } catch (err: any) {
    console.error("API Error Detail:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}