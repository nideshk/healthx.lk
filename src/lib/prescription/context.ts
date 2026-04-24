import { supabaseAdmin } from "../supabaseAdmin";
import { s3 } from "../s3/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function preparePrescriptionPDFData(appointmentId: string, prescriptionData: any) {
  // 1. Fetch Appointment, Patient, and Practitioner Details
  const { data: appt, error } = await supabaseAdmin
    .from("appointments")
    .select(`
      starts_at,
      patients!fk_appointments_patient (
        id,
        full_name,
        dob,
        gender,
        address,
        allergies,
        email,
        contact_number
      ),
      practitioners!fk_appointments_practitioner (
        id,
        full_name,
        qualification,
        specialization,
        license_number,
        experience_years,
        contact_email,
        contact_number,
        signature_url
      )
    `)
    .eq("id", appointmentId)
    .single();

  if (error) {
    console.error("❌ Supabase fetch error:", error);
    throw error;
  }

  const patient = (Array.isArray(appt?.patients) ? appt.patients[0] : appt?.patients) as any;
  const practitioner = (Array.isArray(appt?.practitioners) ? appt.practitioners[0] : appt?.practitioners) as any;

  if (!patient) throw new Error("❌ Patient NOT fetched");
  if (!practitioner) throw new Error("❌ Practitioner NOT fetched");

  const allergies = patient?.allergies?.length
    ? patient.allergies.join(", ")
    : "None";

  // Calculate patient age
  let patientAge = "N/A";
  if (patient?.dob) {
    const diff = Date.now() - new Date(patient.dob).getTime();
    const ageDate = new Date(diff);
    patientAge = Math.abs(ageDate.getUTCFullYear() - 1970).toString();
  }
  const patientGender = patient?.gender || "Unknown";
  const appointmentDate = appt?.starts_at || new Date().toISOString().split('T')[0];

  // 2. Resolve Diagnosis Details
  let diagnosisDisplay = prescriptionData.diagnosis || "N/A";
  if (prescriptionData.diagnosis_id) {
    const { data: diag } = await supabaseAdmin
      .from("diagnoses")
      .select("name, code")
      .eq("id", prescriptionData.diagnosis_id)
      .maybeSingle();

    if (diag) {
      diagnosisDisplay = `${diag.name} (${diag.code})`;
    }
  } else if (prescriptionData.diagnosis_code && prescriptionData.diagnosis) {
    diagnosisDisplay = `${prescriptionData.diagnosis} (${prescriptionData.diagnosis_code})`;
  }

  // 3. Handle Practitioner Signature
  let signedSignatureUrl = null;
  if (practitioner?.signature_url) {
    try {
      signedSignatureUrl = await getSignedUrl(s3, new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: practitioner.signature_url,
      }), { expiresIn: 60 * 10 }); // 10 minutes
    } catch (e) {
      console.error("Failed to sign signature URL", e);
    }
  }

  // 4. Fetch Platform Settings
  const { data: settingsData } = await supabaseAdmin
    .from("platform_settings")
    .select("key, value");

  const settings = settingsData?.reduce((acc: any, curr: any) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {}) || {};

  return {
    appointmentId,
    appointmentDate,
    settings,
    patient: {
      name: patient?.full_name || "Patient",
      age: patientAge,
      gender: patientGender,
      address: patient?.address || "",
      email: patient?.email || "",
      phone: patient?.contact_number || "",
      allergies: allergies,
      dob: patient?.dob || "N/A"
    },
    practitioner: {
      name: practitioner?.full_name || "Clinician",
      title: practitioner?.title || "Dr.",
      credentials: practitioner?.qualification || "",
      licenseNumber: practitioner?.license_number || "",
      signatureUrl: signedSignatureUrl
    },
    diagnosis: diagnosisDisplay,
    items: prescriptionData.items || prescriptionData.prescription_items || [],
    special_notes: prescriptionData.special_notes || prescriptionData.notes || ""
  };
}
