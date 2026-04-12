import { s3 } from "../s3/s3";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { sendEmail } from "../email";
import { generatePrescriptionPDF } from "./pdf";
import { supabaseAdmin } from "../supabaseAdmin";

export async function processPrescriptionIssuance(params: {
  appointmentId: string;
  patientEmail: string;
  patientName: string;
  prescriptionData: any;
}) {
  const { appointmentId, patientEmail, patientName, prescriptionData } = params;

  // 0. Fetch Appointment, Patient, and Practitioner Details
  const { data: appt } = await supabaseAdmin
    .from("appointments")
    .select(`
      date, 
      practitioner_id, 
      patients ( date_of_birth, gender ),
      practitioners ( full_name, title, qualifications, registration_number )
    `)
    .eq("id", appointmentId)
    .single();

  const doctorName = appt?.practitioners?.full_name || "Clinician";
  const doctorTitle = appt?.practitioners?.title || "Dr.";
  const doctorQuals = appt?.practitioners?.qualifications || "";
  const doctorReg = appt?.practitioners?.registration_number || "";
  
  // Calculate patient age
  let patientAge = "N/A";
  if (appt?.patients?.date_of_birth) {
    const diff = Date.now() - new Date(appt.patients.date_of_birth).getTime();
    const ageDate = new Date(diff); 
    patientAge = Math.abs(ageDate.getUTCFullYear() - 1970).toString();
  }
  const patientGender = appt?.patients?.gender || "Unknown";
  const appointmentDate = appt?.date || new Date().toISOString().split('T')[0];

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

  // 2. Generate PDF
  const pdfBuffer = await generatePrescriptionPDF({
    appointmentId,
    appointmentDate,
    patientName,
    patientAge,
    patientGender,
    doctorName,
    doctorTitle,
    doctorQuals,
    doctorReg,
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
