import PDFDocument from "pdfkit";
import path from "path";

export async function generatePrescriptionPDF(data: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
      const chunks: Buffer[] = [];

      // Background drawing logic
      drawBackground(doc);
      doc.on("pageAdded", () => {
        drawBackground(doc);
      });

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width;

      // Paths for assets
      const logoPath = path.join(process.cwd(), "public", "assets", "logo_copy.png");
      const rxLogoPath = path.join(process.cwd(), "public", "assets", "rx_logo_transparent_v2.png");
      const rxWhiteLogoPath = path.join(process.cwd(), "public", "assets", "rx_logo_white.png");

      // Content area starts below header
      let y = 125;

      // ---------------- PATIENT INFO ----------------
      drawSectionHeader(doc, "Patient Information:", y, 25);
      y += 30;

      y = drawStyledField(doc, "Full Name:", data.patient?.name, y);
      y = drawStyledFieldRow(doc, "Date Of birth:", data.patient?.dob || "DD/MM/YYYY", "Age:", data.patient?.age || "XX years and XX months", y);
      y = drawStyledField(doc, "Address:", data.patient?.address, y);
      y = drawStyledFieldRow(doc, "E-mail:", data.patient?.email, "Phone:", data.patient?.phone, y);
      y = drawStyledField(doc, "Allergies:", data.patient?.allergies, y);

      // ---------------- DIAGNOSIS ----------------
      y += 2;
      drawSectionHeader(doc, "Diagnosis", y, 25);
      doc.roundedRect(142, y + 3.5, pageWidth - 142 - 45, 18, 2).fill("#fff");
      doc.fontSize(10).font("Helvetica").fillColor("#000").text(data.diagnosis || "", 150, y + 8.5);
      y += 30;

      // ---------------- MEDICINES TABLE ----------------
      drawSectionHeader(doc, "", y, 25, rxWhiteLogoPath);
      y += 30;

      const colX = [40, 195, 295, 420];
      const colWidths = [155, 100, 125, 115];
      const tableWidth = pageWidth - 80;

      const headerHeight = 25;
      doc.rect(40, y, tableWidth, headerHeight).fill("#D1E9FF");
      doc.rect(40, y, tableWidth, headerHeight).strokeColor("#82B1FF").lineWidth(0.5).stroke();
      
      [195, 295, 420].forEach(x => {
        doc.moveTo(x, y).lineTo(x, y + headerHeight).stroke();
      });

      doc.fontSize(10).font("Helvetica-Bold").fillColor("#000");
      doc.text("Drug name", colX[0], y + 8, { width: colWidths[0], align: "center" });
      doc.text("Route", colX[1], y + 8, { width: colWidths[1], align: "center" });
      doc.text("Strength", colX[2], y + 8, { width: colWidths[2], align: "center" });
      doc.text("Duration", colX[3], y + 8, { width: colWidths[3], align: "center" });

      y += headerHeight;

      const items = data.items || [];
      const rowCount = Math.max(3, items.length);
      const rowHeight = 25;
      
      for (let i = 0; i < rowCount; i++) {
        const item = items[i];
        
        if (y + rowHeight > doc.page.height - 100) {
          doc.addPage();
          y = 135;
        }

        doc.rect(40, y, tableWidth, rowHeight).strokeColor("#82B1FF").lineWidth(0.5).stroke();
        [195, 295, 420].forEach(x => {
          doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke();
        });

        if (item) {
          doc.fontSize(9).font("Helvetica").fillColor("#000");
          doc.text(item.medicine_name || "", colX[0] + 5, y + 8, { width: colWidths[0] - 10, align: "center" });
          doc.text(item.route || "", colX[1] + 5, y + 8, { width: colWidths[1] - 10, align: "center" });
          doc.text(item.strength || "", colX[2] + 5, y + 8, { width: colWidths[2] - 10, align: "center" });
          doc.text(item.duration || "", colX[3] + 5, y + 8, { width: colWidths[3] - 10, align: "center" });
        }
        y += rowHeight;
      }

      y += 8;

      // ---------------- DOCTOR NOTES ----------------
      if (y + 50 > doc.page.height - 100) {
        doc.addPage();
        y = 135;
      }
      doc.fontSize(10).font("Helvetica").fillColor("#000").text("Doctor Notes:", 40, y + 8);
      doc.rect(142, y, pageWidth - 142 - 40, 35).fillAndStroke("#FFFFFF", "#aaa");
      doc.fillColor("#000").fontSize(9).text(data.special_notes || "", 150, y + 10, { width: pageWidth - 142 - 50 });
      y += 80;

      // ---------------- DOCTOR DETAILS & SIGNATURE (END OF CONTENT) ----------------
      y = drawDoctorSignatureBlock(doc, data, y);

      // ---------------- POST-PROCESS: STAMP HEADERS & FOOTERS ----------------
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        drawFixedHeader(doc, logoPath, rxLogoPath);
        drawFixedFooter(doc, i + 1, range.count);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ---------------- HELPERS ----------------

function drawBackground(doc: any) {
  const pageHeight = doc.page.height;
  const pageWidth = doc.page.width;
  doc.rect(0, 0, pageWidth, pageHeight).fill("#EEF6FF");
}

function drawFixedHeader(doc: any, logoPath: string, rxLogoPath: string) {
  const pageWidth = doc.page.width;
  const headerY = 30;

  try {
    doc.image(logoPath, 40, headerY, { width: 140 });
  } catch (e) {
    doc.fontSize(20).font("Helvetica-Bold").fillColor("#000").text("CLINECXA", 40, headerY);
  }

  doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333");
  const addressText = "Nava City Building,\nNo. 787/G, Kaduwela Malabe Road, Malabe, Sri Lanka\nT: +94 771 050 867   E: support@clinecxa.lk";
  doc.text(addressText, pageWidth - 320, headerY + 10, { align: "right", width: 280, lineGap: 2 });

  const titleY = headerY + 60;
  try {
    doc.image(rxLogoPath, (pageWidth / 2) - 65, titleY - 5, { width: 35 });
  } catch (e) {
    doc.fontSize(24).font("Helvetica-Bold").fillColor("#000").text("Rx", (pageWidth / 2) - 60, titleY - 5);
  }
  doc.fontSize(16).font("Helvetica-Bold").fillColor("#000").text("e-Prescription", (pageWidth / 2) - 25, titleY);
}

function drawDoctorSignatureBlock(doc: any, data: any, y: number) {
  const pageHeight = doc.page.height;
  
  // Check for overflow - block height approx 130
  if (y + 130 > pageHeight - 60) {
    doc.addPage();
    y = 135;
  }

  doc.fillColor("black").strokeColor("black").lineWidth(0.5);

  drawSectionHeader(doc, "Doctor details:", y, 25);
  y += 30;
  
  y = drawStyledField(doc, "Full Name:", data.practitioner?.name, y);
  y = drawStyledField(doc, "Credentials:", data.practitioner?.credentials, y);
  y = drawStyledField(doc, "SLMC Registration number:", data.practitioner?.licenseNumber, y, 165);
  
  const sigY = y + 5;
  doc.rect(40, sigY, 200, 30).fillAndStroke("#FFFFFF", "#aaa");
  doc.fillColor("#000").fontSize(12).font("Times-Italic").text("Signature", 60, sigY + 10, { lineBreak: false });
  
  const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Colombo", hour12: true });
  doc.fontSize(8).font("Helvetica").fillColor("#444").text(`Signed on ${timestamp} Sri Lanka time`, 40, sigY + 38, { lineBreak: false });

  return y + 60;
}

function drawFixedFooter(doc: any, pageNum: number, totalPages: number) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  
  const bottomY = pageHeight - 40;
  doc.rect(40, bottomY, 350, 16).strokeColor("#aaa").lineWidth(0.5).stroke();

  doc.fillColor("#000").fontSize(9).font("Helvetica")
    .text(`Page ${pageNum} out of ${totalPages}`, pageWidth - 120, bottomY + 3, { align: "right", lineBreak: false });
}

function drawSectionHeader(doc: any, title: string, y: number, height: number = 22, imagePath?: string) {
  const pageWidth = doc.page.width;
  const grad = doc.linearGradient(40, y, pageWidth - 40, y);
  grad.stop(0, "#01579B").stop(1, "#4FC3F7");
  doc.roundedRect(40, y, pageWidth - 80, height, 4).fill(grad);

  if (imagePath) {
    try {
      doc.image(imagePath, 50, y + 2, { height: height - 4 });
    } catch (e) {
      if (title) {
        doc.fillColor("white").fontSize(10).font("Helvetica-Bold").text(title, 50, y + (height / 2) - 4, { lineBreak: false });
      }
    }
  } else if (title) {
    doc.fillColor("white").fontSize(10).font("Helvetica-Bold").text(title, 50, y + (height / 2) - 4, { lineBreak: false });
  }
  doc.fillColor("black");
}

function drawStyledField(doc: any, label: string, value: string | undefined, y: number, customBoxX?: number) {
  doc.fontSize(10).font("Helvetica").fillColor("#000").text(label, 40, y + 6, { lineBreak: false });
  const boxX = customBoxX || 142;
  const boxWidth = doc.page.width - boxX - 40;
  const boxHeight = 20;
  doc.rect(boxX, y, boxWidth, boxHeight).fillAndStroke("#FFFFFF", "#aaa");
  if (value) {
    doc.fillColor("#000").font("Helvetica").text(value, boxX + 8, y + 6, { lineBreak: false });
  }
  return y + boxHeight + 4;
}

function drawStyledFieldRow(doc: any, label1: string, val1: string | undefined, label2: string, val2: string | undefined, y: number) {
  const boxHeight = 20;
  doc.fontSize(10).font("Helvetica").fillColor("#000").text(label1, 40, y + 6, { lineBreak: false });
  doc.rect(142, y, 180, boxHeight).fillAndStroke("#FFFFFF", "#aaa");
  doc.fillColor("#000");
  if (val1) doc.text(val1, 150, y + 6, { lineBreak: false });

  const label2X = 335;
  doc.text(label2, label2X, y + 6, { lineBreak: false });

  const box2X = label2X + 35;
  const box2Width = doc.page.width - box2X - 40;
  doc.rect(box2X, y, box2Width, boxHeight).fillAndStroke("#FFFFFF", "#aaa");
  doc.fillColor("#000");
  if (val2) doc.text(val2, box2X + 8, y + 6, { lineBreak: false });

  return y + boxHeight + 4;
}