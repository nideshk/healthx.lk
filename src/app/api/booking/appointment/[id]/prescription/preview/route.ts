import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { preparePrescriptionPDFData } from "@/lib/prescription/context";
import { generatePrescriptionPDF } from "@/lib/prescription/pdf";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: appointmentId } = await context.params;
  const { authorized } = await requireUser(request);
  
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    // 1. Prepare data (performs metadata fetching but NO persistence)
    const pdfData = await preparePrescriptionPDFData(appointmentId, body);
    
    // 2. Generate PDF Buffer
    const pdfBuffer = await generatePrescriptionPDF(pdfData);

    // 3. Return as PDF stream
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=prescription_preview.pdf",
        "Cache-Control": "no-store, max-age=0"
      },
    });
  } catch (err: any) {
    console.error("❌ Prescription Preview API error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate preview" }, { status: 500 });
  }
}
