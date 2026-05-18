import PDFDocument from "pdfkit";
import path from "path";
import axios from "axios";

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

      // ---------------- SIGNATURE BUFFER ----------------
      let signatureBuffer: Buffer | null = null;
      if (data.practitioner?.signatureUrl) {
        fetchImageBuffer(data.practitioner.signatureUrl)
          .then(buf => {
            signatureBuffer = buf;
          })
          .catch(err => console.error("Failed to fetch signature image:", err))
          .finally(async () => {
            try {
              // Continue PDF generation after attempt to fetch signature
              await startDrawing();
            } catch (err) {
              reject(err);
            }
          });
      } else {
        startDrawing().catch(reject);
      }

      async function startDrawing() {
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

        const colX = [40, 165, 235, 315, 395];
        const colWidths = [125, 70, 80, 80, 160];
        const tableWidth = pageWidth - 80;

        const headerHeight = 25;
        doc.rect(40, y, tableWidth, headerHeight).fill("#D1E9FF");
        doc.rect(40, y, tableWidth, headerHeight).strokeColor("#82B1FF").lineWidth(0.5).stroke();

        [165, 235, 315, 395].forEach(x => {
          doc.moveTo(x, y).lineTo(x, y + headerHeight).stroke();
        });

        doc.fontSize(10).font("Helvetica-Bold").fillColor("#000");
        doc.text("Drug name", colX[0], y + 8, { width: colWidths[0], align: "center" });
        doc.text("Route", colX[1], y + 8, { width: colWidths[1], align: "center" });
        doc.text("Strength", colX[2], y + 8, { width: colWidths[2], align: "center" });
        doc.text("Duration", colX[3], y + 8, { width: colWidths[3], align: "center" });
        doc.text("Notes", colX[4], y + 8, { width: colWidths[4], align: "center" });

        y += headerHeight;

        const items = data.items || [];
        const rowCount = Math.max(3, items.length);

        for (let i = 0; i < rowCount; i++) {
          const item = items[i];

          // Calculate dynamic row height based on all columns
          let dynamicRowHeight = 25;
          if (item) {
            doc.fontSize(9).font("Helvetica");
            const cols = [
              { text: item.medicine_name || "", width: colWidths[0] - 10 },
              { text: item.route || "", width: colWidths[1] - 10 },
              { text: item.strength || "", width: colWidths[2] - 10 },
              { text: item.duration || "", width: colWidths[3] - 10 },
              { text: item.notes || "", width: colWidths[4] - 10 }
            ];

            cols.forEach(col => {
              const h = doc.heightOfString(col.text, { width: col.width, align: "center" }) + 16;
              dynamicRowHeight = Math.max(dynamicRowHeight, h);
            });
          }

          if (y + dynamicRowHeight > doc.page.height - 100) {
            doc.addPage();
            y = 135;
          }

          doc.rect(40, y, tableWidth, dynamicRowHeight).strokeColor("#82B1FF").lineWidth(0.5).stroke();
          [165, 235, 315, 395].forEach(x => {
            doc.moveTo(x, y).lineTo(x, y + dynamicRowHeight).stroke();
          });

          if (item) {
            doc.fontSize(9).font("Helvetica").fillColor("#000");

            // Draw columns with individual vertical centering if needed, but here we just use a consistent top offset
            // pdfkit doesn't have a direct "vertical align center" for a box, so we calculate it
            const drawCol = (text: string, x: number, width: number) => {
              const textHeight = doc.heightOfString(text, { width: width, align: "center" });
              const vOffset = (dynamicRowHeight - textHeight) / 2;
              doc.text(text, x, y + vOffset, { width: width, align: "center" });
            };

            drawCol(item.medicine_name || "", colX[0] + 5, colWidths[0] - 10);
            drawCol(item.route || "", colX[1] + 5, colWidths[1] - 10);
            drawCol(item.strength || "", colX[2] + 5, colWidths[2] - 10);
            drawCol(item.duration || "", colX[3] + 5, colWidths[3] - 10);
            drawCol(item.notes || "", colX[4] + 5, colWidths[4] - 10);
          }
          y += dynamicRowHeight;
        }

        y += 8;

        // ---------------- DOCTOR NOTES ----------------
        if (y + 50 > doc.page.height - 100) {
          doc.addPage();
          y = 135;
        }

        const doctorNotes = data.special_notes || "";
        doc.fontSize(10).font("Helvetica").fillColor("#000").text("Doctor Notes:", 40, y + 8);

        const notesBoxWidth = pageWidth - 142 - 40;
        const notesTextHeight = doc.heightOfString(doctorNotes, { width: notesBoxWidth - 10 });
        const notesBoxHeight = Math.max(35, notesTextHeight + 15);

        doc.rect(142, y, notesBoxWidth, notesBoxHeight).fillAndStroke("#FFFFFF", "#aaa");
        doc.fillColor("#000").fontSize(9).text(doctorNotes, 150, y + 10, { width: notesBoxWidth - 10 });
        y += notesBoxHeight + 20;

        // ---------------- DOCTOR DETAILS & SIGNATURE (END OF CONTENT) ----------------
        y = drawDoctorSignatureBlock(doc, data, y, signatureBuffer);

        // ---------------- POST-PROCESS: STAMP HEADERS & FOOTERS ----------------
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
          doc.switchToPage(i);
          drawFixedHeader(doc, logoPath, rxLogoPath, data.settings);
          drawFixedFooter(doc, i + 1, range.count, data.settings);
        }

        doc.end();
      }
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

function drawFixedHeader(doc: any, logoPath: string, rxLogoPath: string, settings?: any) {
  const pageWidth = doc.page.width;
  const headerY = 30;

  try {
    doc.image(logoPath, 40, headerY, { width: 140 });
  } catch (e) {
    const orgName = settings?.org_name || "CLINECXA";
    doc.fontSize(20).font("Helvetica-Bold").fillColor("#000").text(orgName, 40, headerY);
  }

  doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333");

  const address = settings?.org_address || "Nava City Building,\nNo. 787/G, Kaduwela Malabe Road, Malabe, Sri Lanka";
  const phone = settings?.org_phone || "+94 771 050 867";
  const email = settings?.org_email || "support@clinecxa.lk";

  const addressText = `${address}\nT: ${phone}   E: ${email}`;
  doc.text(addressText, pageWidth - 320, headerY + 10, { align: "right", width: 280, lineGap: 2 });

  const titleY = headerY + 60;
  doc.fontSize(16).font("Helvetica-Bold").fillColor("#000").text("e-Prescription", 0, titleY, { align: "center", width: pageWidth });
}

function drawDoctorSignatureBlock(doc: any, data: any, y: number, signatureBuffer: Buffer | null = null) {
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

  if (signatureBuffer) {
    try {
      doc.image(signatureBuffer, 40, sigY, { height: 40 });
    } catch (e) {
      doc.rect(40, sigY, 200, 30).fillAndStroke("#FFFFFF", "#aaa");
      doc.fillColor("#000").fontSize(12).font("Times-Italic").text("Signature", 60, sigY + 10, { lineBreak: false });
    }
  } else {
    doc.rect(40, sigY, 200, 30).fillAndStroke("#FFFFFF", "#aaa");
    doc.fillColor("#000").fontSize(12).font("Times-Italic").text("Signature", 60, sigY + 10, { lineBreak: false });
  }

  const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Colombo", hour12: true });
  doc.fontSize(8).font("Helvetica").fillColor("#444").text(`Signed on ${timestamp} Sri Lanka time`, 40, sigY + 38, { lineBreak: false });

  return y + 60;
}

function drawFixedFooter(doc: any, pageNum: number, totalPages: number, settings?: any) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  const bottomY = pageHeight - 40;

  // Disclaimer
  if (settings?.disclaimer) {
    doc.fontSize(7).font("Helvetica-Oblique").fillColor("#666")
      .text(settings.disclaimer, 40, bottomY - 15, { width: pageWidth - 80, align: "center", lineGap: 1 });
  }

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
  const boxX = customBoxX || 142;
  const boxWidth = doc.page.width - boxX - 40;

  doc.fontSize(10).font("Helvetica").fillColor("#000").text(label, 40, y + 6, { lineBreak: false });

  const val = value || "";
  const textHeight = doc.heightOfString(val, { width: boxWidth - 10 });
  const boxHeight = Math.max(20, textHeight + 10);

  // Cleaner look: Light gray background instead of heavy borders if preferred, 
  // but let's keep consistent with current style but make it dynamic.
  doc.rect(boxX, y, boxWidth, boxHeight).fillAndStroke("#FFFFFF", "#eee");
  doc.fillColor("#000").font("Helvetica").text(val, boxX + 8, y + (boxHeight - textHeight) / 2, { width: boxWidth - 10 });

  return y + boxHeight + 6;
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  return Buffer.from(response.data, "binary");
}

function drawStyledFieldRow(doc: any, label1: string, val1: string | undefined, label2: string, val2: string | undefined, y: number) {
  const box1Width = 180;
  const val1Str = val1 || "";
  doc.fontSize(10).font("Helvetica").fillColor("#000");

  const h1 = doc.heightOfString(val1Str, { width: box1Width - 10 });

  const label2X = 335;
  const box2X = label2X + 35;
  const box2Width = doc.page.width - box2X - 40;
  const val2Str = val2 || "";
  const h2 = doc.heightOfString(val2Str, { width: box2Width - 10 });

  const boxHeight = Math.max(20, h1 + 10, h2 + 10);

  // Label 1
  doc.fillColor("#000").text(label1, 40, y + (boxHeight - 10) / 2, { lineBreak: false });
  doc.roundedRect(142, y, box1Width, boxHeight, 2).fillAndStroke("#FFFFFF", "#eee");
  doc.fillColor("#000").text(val1Str, 150, y + (boxHeight - h1) / 2, { width: box1Width - 10 });

  // Label 2
  doc.fillColor("#000").text(label2, label2X, y + (boxHeight - 10) / 2, { lineBreak: false });
  doc.roundedRect(box2X, y, box2Width, boxHeight, 2).fillAndStroke("#FFFFFF", "#eee");
  doc.fillColor("#000").text(val2Str, box2X + 8, y + (boxHeight - h2) / 2, { width: box2Width - 10 });

  return y + boxHeight + 6;
}