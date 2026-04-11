/**
 * Dummy PDF Generator
 * In a real scenario, this would use a library like jspdf or pdfkit.
 * For now, it returns a simple Buffer that can be handled as a PDF file.
 */
export async function generatePrescriptionPDF(data: any): Promise<Buffer> {
  const content = `
    RX-PRESCRIPTION
    ---------------------------------
    Date: ${new Date().toLocaleDateString()}
    Appointment ID: ${data.appointmentId}
    ---------------------------------
    Diagnosis: ${data.diagnosis || 'N/A'}
    ---------------------------------
    Medicines:
    ${(data.items || []).map((i: any) => `- ${i.medicine_name} (${i.strength}) - ${i.route} for ${i.duration}`).join('\n')}
    ---------------------------------
    Special Notes: ${data.special_notes || 'None'}
    ---------------------------------
    Any repeated use of this prescription, or used by unauthorised persons 
    other than the intended patient, is illegal and can be prosecuted.
  `;

  // For a dummy PDF, we just wrap the text in a minimal PDF-like structure
  // Or just return the buffer of the string. S3 will treat it as a file.
  // Real PDF generation would happen here.
  return Buffer.from(content, 'utf-8');
}
