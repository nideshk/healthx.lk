import { sendEmail } from "@/lib/email";

interface PrescriptionEmailParams {
  patientEmail: string;
  patientName: string;
  practitionerName: string;
  pdfBuffer: Buffer;
  prescriptionId: string;
}

export async function sendPrescriptionEmail({
  patientEmail,
  patientName,
  practitionerName,
  pdfBuffer,
  prescriptionId,
}: PrescriptionEmailParams) {
  const subject = `Your Medical Prescription - Ref: ${prescriptionId.substring(0, 8)}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
      <h2 style="color: #2980b9;">Medical Prescription</h2>
      <p>Hello <strong>${patientName}</strong>,</p>
      <p>Please find attached your medical prescription issued by <strong>Dr. ${practitionerName}</strong>.</p>
      <p>This prescription was generated following your telehealth consultation on Clinico Telehealth.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px;"><strong>Prescription Reference:</strong> ${prescriptionId}</p>
        <p style="margin: 0; font-size: 14px;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>

      <p>You can present the attached PDF at any pharmacy to fulfill your medication requirements.</p>
      
      <p style="margin-top: 30px; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 10px;">
        <strong>Disclaimer:</strong> This is an electronically generated prescription. For any clinical questions regarding the dosage or medications, please consult your doctor directly via the Clinico platform.
      </p>
      <p style="font-size: 10px; color: #aaa;">&copy; ${new Date().getFullYear()} Clinico Telehealth. All rights reserved.</p>
    </div>
  `;

  return sendEmail({
    to: patientEmail,
    subject,
    html,
    attachments: [
      {
        filename: `Prescription_${prescriptionId.substring(0, 8)}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  });
}
