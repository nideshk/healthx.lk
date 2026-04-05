import { jsPDF } from "jspdf";
import "jspdf-autotable";

interface PrescriptionItem {
  medicine_name: string;
  strength: string;
  route: string;
  duration: string;
  notes?: string;
}

interface PrescriptionData {
  prescription_id: string;
  issued_at: string;
  patient: {
    full_name: string;
    age?: number | string;
    gender?: string;
    contact_number?: string;
    address?: string;
  };
  practitioner: {
    full_name: string;
    qualification?: string;
    license_number?: string;
    contact_email?: string;
    signature_url?: string;
  };
  diagnosis?: string;
  special_notes?: string;
  items: PrescriptionItem[];
}

export async function generatePrescriptionPDF(data: PrescriptionData): Promise<Buffer> {
  const doc = new jsPDF() as any; // Cast as any to access autotable

  const margin = 15;
  const pageWidth = doc.internal.pageSize.width;
  let currentY = 20;

  // Header: Clinic Name (Fallback to Brand)
  doc.setFontSize(22);
  doc.setTextColor(41, 128, 185); // Blue
  doc.text("Clinico Telehealth", margin, currentY);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("E-Prescription", pageWidth - margin - 30, currentY);

  currentY += 10;
  doc.setDrawColor(200);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 15;

  // Doctor Details (Left)
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(`Dr. ${data.practitioner.full_name}`, margin, currentY);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  currentY += 5;
  if (data.practitioner.qualification) {
    doc.text(data.practitioner.qualification, margin, currentY);
    currentY += 5;
  }
  if (data.practitioner.license_number) {
    doc.text(`License: ${data.practitioner.license_number}`, margin, currentY);
    currentY += 5;
  }

  // Prescription Metadata (Right)
  const rightColumnX = pageWidth / 2 + 10;
  let rightY = 45;
  doc.text(`Prescription ID: ${data.prescription_id.substring(0, 8)}`, rightColumnX, rightY);
  rightY += 5;
  doc.text(`Date: ${new Date(data.issued_at).toLocaleDateString()}`, rightColumnX, rightY);

  currentY = Math.max(currentY, rightY) + 15;

  // Patient Info Box
  doc.setFillColor(245, 247, 250);
  doc.rect(margin, currentY, pageWidth - 2 * margin, 25, "F");
  
  let patientY = currentY + 10;
  doc.setFont("helvetica", "bold");
  doc.text("Patient:", margin + 5, patientY);
  doc.setFont("helvetica", "normal");
  doc.text(data.patient.full_name, margin + 25, patientY);
  
  if (data.patient.age) {
    doc.text(`Age: ${data.patient.age}`, margin + 80, patientY);
  }
  
  patientY += 8;
  if (data.patient.address) {
    doc.text(`Address: ${data.patient.address.substring(0, 50)}`, margin + 25, patientY);
  }

  currentY += 35;

  // Diagnosis
  if (data.diagnosis) {
    doc.setFont("helvetica", "bold");
    doc.text("Diagnosis:", margin, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(data.diagnosis, margin + 25, currentY);
    currentY += 15;
  }

  // Medicine Table
  const tableData = data.items.map((item) => [
    item.medicine_name,
    item.strength,
    item.route,
    item.duration,
    item.notes || "-",
  ]);

  doc.autoTable({
    startY: currentY,
    head: [["Medicine", "Strength", "Route", "Duration", "Instructions"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185] },
    margin: { left: margin, right: margin },
  });

  currentY = doc.lastAutoTable.finalY + 15;

  // Special Notes
  if (data.special_notes) {
    doc.setFont("helvetica", "bold");
    doc.text("Special Notes:", margin, currentY);
    currentY += 7;
    doc.setFont("helvetica", "normal");
    const splitNotes = doc.splitTextToSize(data.special_notes, pageWidth - 2 * margin);
    doc.text(splitNotes, margin, currentY);
    currentY += splitNotes.length * 5 + 10;
  }

  // Signature Section
  const signatureY = pageWidth > 200 ? 250 : doc.internal.pageSize.height - 50; 
  // Ensure signature is at bottom or follows content
  const finalY = Math.max(currentY, signatureY);

  if (data.practitioner.signature_url) {
    try {
        // Note: In a real server-side env, we might need to fetch the image first
        // But jsPDF can take a URL if it's accessible.
        // For server-side Node, it's safer to fetch the buffer.
        // To keep it simple and robust, we'll assume the URL works or handle it in the caller.
        doc.addImage(data.practitioner.signature_url, "PNG", margin, finalY, 40, 20);
    } catch (e) {
        console.error("Failed to add signature image:", e);
    }
  }

  doc.setFont("helvetica", "bold");
  doc.text("__________________________", margin, finalY + 25);
  doc.text("Authorized Signature", margin, finalY + 30);

  // Disclaimer
  doc.setFontSize(8);
  doc.setTextColor(150);
  const disclaimer = "This is a digitally generated e-prescription. Please verify with your doctor if you have any questions. Invalid without official digital verification.";
  doc.text(disclaimer, margin, doc.internal.pageSize.height - 10);

  return Buffer.from(doc.output("arraybuffer"));
}
