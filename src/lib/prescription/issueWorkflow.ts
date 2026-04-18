import { s3 } from "../s3/s3";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { sendEmail } from "../email";
import { generatePrescriptionPDF } from "./pdf";
import { supabaseAdmin } from "../supabaseAdmin";
import fs from "fs";
import path from "path";

export async function processPrescriptionIssuance(params: {
  appointmentId: string;
  patientEmail: string;
  patientName: string;
  prescriptionData: any;
}) {
  const { appointmentId, patientEmail, patientName, prescriptionData } = params;

  // 0. Fetch Appointment, Patient, and Practitioner Details
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

  // 1. Fetch Diagnosis Details for the PDF
  let diagnosisDisplay = "N/A";
  if (prescriptionData.diagnosis_id) {
    const { data: diag } = await supabaseAdmin
      .from("diagnoses")
      .select("name, code")
      .eq("id", prescriptionData.diagnosis_id)
      .maybeSingle();

    if (diag) {
      diagnosisDisplay = `${diag.name} (${diag.code})`;
    }
  }

  // 2. Handle Practitioner Signature
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

  // 3. Generate PDF
  const pdfBuffer = await generatePrescriptionPDF({
    appointmentId,
    appointmentDate,
    patient: {
      name: patientName,
      age: patientAge,
      gender: patientGender,
      address: patient?.address || "",
      email: patient?.email || patientEmail,
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
    items: prescriptionData.items,
    special_notes: prescriptionData.special_notes
  });

  // 2. Upload to S3
  const bucketName = "clinecxa-prescription-bucket-prod";
  const fileKey = `prescriptions/${appointmentId}_${Date.now()}.pdf`;

  const uploadParams = {
    Bucket: bucketName,
    Key: fileKey,
    Body: pdfBuffer,
    ContentType: "application/pdf"
  };

  await s3.send(new PutObjectCommand(uploadParams));

  // Generate a 7-day signed URL for the email link
  const signedUrl = await getSignedUrl(s3, new GetObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
  }), { expiresIn: 60 * 60 * 24 * 7 }); // 7 days

  // 3. Send Email using existing utility
  const emailHtml = `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2>Your Prescription is Ready</h2>
      <p>Hello ${patientName || 'Patient'},</p>
      <p>Your prescription for the consultation ${appointmentId} has been issued.</p>
      <p>You can view and download it using the link below:</p>
      <a href="${signedUrl}" style="display: inline-block; padding: 10px 20px; background: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">View Prescription</a>
      <p style="font-size: 12px; color: #888;">This link expires in 7 days. After that, please log in to your patient portal to access it.</p>
      <p>Stay healthy!</p>
    </div>
  `;

  await sendEmail({
    to: patientEmail,
    subject: "Your Prescription - Clinecxa",
    html: emailHtml,
    attachments: [
      {
        filename: `Prescription_${appointmentId}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf"
      }
    ]
  });

  // 4. Update the DB with S3 key (not full URL) and Issued status
  // Following the same pattern as attachments - store the key, sign on read
  await supabaseAdmin
    .from("prescriptions")
    .update({
      pdf_url: fileKey,
      status: 'issued',
      issued_at: new Date().toISOString()
    })
    .eq("appointment_id", appointmentId);

  return fileKey;
}
