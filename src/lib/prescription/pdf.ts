import PDFDocument from "pdfkit";

export async function generatePrescriptionPDF(data: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // --- Header ---
      doc.fontSize(20).font("Helvetica-Bold").text("CLINECXA E-PRESCRIPTION", { align: 'center' });
      doc.moveDown(1.5);

      // --- Practitioner & Patient Details ---
      const topY = doc.y;

      // Left Column (Practitioner)
      doc.fontSize(10).font("Helvetica-Bold").text("PRESCRIBING CLINICIAN", 50, topY);
      doc.font("Helvetica").text(`${data.doctorTitle || ''} ${data.doctorName || ''}`);
      if (data.doctorQuals) doc.text(data.doctorQuals);
      if (data.doctorReg) doc.text(`Reg: ${data.doctorReg}`);

      // Right Column (Patient)
      doc.font("Helvetica-Bold").text("PATIENT DETAILS", 350, topY);
      doc.font("Helvetica").text(`Name: ${data.patientName || "Unknown"}`, 350);
      doc.text(`Age/Sex: ${data.patientAge || 'N/A'} Yrs / ${data.patientGender || "Unknown"}`, 350);
      doc.text(`Date: ${new Date(data.appointmentDate || Date.now()).toLocaleDateString()}`, 350);

      doc.moveDown(3);

      // --- Line Separator ---
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // --- Rx Symbol and Diagnosis ---
      doc.fontSize(24).font("Helvetica-Bold").text("Rx", 50, doc.y);
      doc.moveDown(0.5);

      doc.fontSize(12).font("Helvetica-Bold").text("Diagnosis / Indication:");
      doc.fontSize(10).font("Helvetica").text(data.diagnosis || 'N/A', { indent: 20 });
      doc.moveDown(1.5);

      // --- Medicines ---
      doc.fontSize(12).font("Helvetica-Bold").text("Medicines:");
      doc.moveDown(0.5);

      if (!data.items || data.items.length === 0) {
        doc.fontSize(10).font("Helvetica-Oblique").text("No medicines prescribed.", { indent: 20 });
      } else {
        data.items.forEach((item: any, idx: number) => {
          doc.fontSize(11).font("Helvetica-Bold").text(`${idx + 1}. ${item.medicine_name} ${item.strength ? `(${item.strength})` : ''}`, { indent: 20 });
          doc.fontSize(10).font("Helvetica").text(`Route: ${item.route || 'Oral'}   |   Duration: ${item.duration || 'N/A'}`, { indent: 40 });
          if (item.notes) {
             doc.font("Helvetica-Oblique").text(`Instructions: ${item.notes}`, { indent: 40 });
          }
          doc.moveDown(0.8);
        });
      }

      doc.moveDown(1);

      // --- Special Notes ---
      if (data.special_notes) {
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(1);
        doc.fontSize(11).font("Helvetica-Bold").text("Special Instructions:");
        doc.fontSize(10).font("Helvetica").text(data.special_notes, { indent: 20 });
        doc.moveDown(1);
      }

      // --- Footer ---
      const bottomY = doc.page.height - 80;
      doc.fontSize(8).font("Helvetica-Oblique").fillColor('gray').text(
        "This is a digitally generated e-prescription through the Clinecxa Health platform.\nAny repeated use of this prescription without authorization is illegal.", 
        50, bottomY, { align: 'center' }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
