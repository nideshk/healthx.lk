import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "@/lib/s3/s3";

const PRESCRIPTION_BUCKET = "clinecxa-prescription-bucket-prod";

async function signPrescriptionUrl(s3KeyOrUrl: string) {
  // Handle old records that stored the full URL instead of just the key
  let s3Key = s3KeyOrUrl;
  if (s3Key.startsWith("https://")) {
    const url = new URL(s3Key);
    s3Key = url.pathname.substring(1); // Remove leading "/"
  }
  const command = new GetObjectCommand({
    Bucket: PRESCRIPTION_BUCKET,
    Key: s3Key,
  });
  return getSignedUrl(s3, command, { expiresIn: 60 * 60 }); // 60 minutes
}

export async function GET(request: NextRequest) {
  const { authorized, user, role } = await requireUser(request);
  console.log("data", authorized, user, role)
  console.log("authorized", authorized)
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const offset = (page - 1) * limit;
  const qPractitionerId = searchParams.get("practitioner_id");
  const qPatientId = searchParams.get("patient_id");

  try {
    let query;
    let items = [];
    let count = 0;

    const isAdmin = role === "admin" || role === "superadmin";
    const isPractitioner = role === "practitioner";
    const isPatient = role === "patient" || user?.patient_id;

    if (isAdmin) {
      // 1. Admin/Superadmin: See across platform, masked clinical data
      query = supabaseAdmin
        .from("prescriptions")
        .select(`
          id, issued_at, status, practitioner_id, patient_id, appointment_id, created_at,
          patients(full_name),
          practitioners(full_name)
        `, { count: 'exact' });

      if (qPractitionerId) {
        query = query.eq("practitioner_id", qPractitionerId);
      }
      if (qPatientId) {
        query = query.eq("patient_id", qPatientId);
      }

      const { data, count: totalCount, error } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Formatting admin response
      items = (data || []).map((p: any) => ({
        id: p.id,
        appointment_id: p.appointment_id,
        status: p.status,
        issued_at: p.issued_at,
        created_at: p.created_at,
        practitioner: {
          id: p.practitioner_id,
          name: p.practitioners?.full_name || "Unknown"
        },
        patient: {
          id: p.patient_id,
          name: p.patients?.full_name || "Unknown"
        }
      }));
      count = totalCount || 0;

    } else if (isPractitioner) {
      // 2. Practitioner: Only see own, full clinical data
      query = supabaseClient
        .from("prescriptions")
        .select(`
          id, issued_at, status, special_notes, pdf_url, appointment_id, created_at,
          patient_id, practitioner_id,
          patients(full_name, email),
          diagnoses(id, name, code, description),
          prescription_items(*)
        `, { count: 'exact' })
        .eq("practitioner_id", user.practitioner_id);

      const { data, count: totalCount, error } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Sign pdf_url for practitioner view
      items = await Promise.all((data || []).map(async (p: any) => ({
        ...p,
        pdf_url: p.pdf_url ? await signPrescriptionUrl(p.pdf_url) : null
      })));
      count = totalCount || 0;

    } else if (isPatient) {
      // 3. Patient: Only see own, only issued, masked clinical data (just PDF)
      query = supabaseClient
        .from("prescriptions")
        .select(`
          id, issued_at, status, pdf_url, appointment_id, practitioner_id, created_at,
          practitioners(full_name)
        `, { count: 'exact' })
        .eq("patient_id", user.patient_id)
        .eq("status", "issued"); // Only show issued prescriptions to patients

      const { data, count: totalCount, error } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      items = await Promise.all((data || []).map(async (p: any) => ({
        id: p.id,
        appointment_id: p.appointment_id,
        status: p.status,
        issued_at: p.issued_at,
        created_at: p.created_at,
        pdf_url: p.pdf_url ? await signPrescriptionUrl(p.pdf_url) : null,
        practitioner: {
          name: p.practitioners?.full_name || "Unknown"
        }
      })));
      count = totalCount || 0;

    } else {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Logging the view action
    const cnx = getAuditContext(request, user);
    await auditLog({
      ...cnx,
      action: "VIEWED",
      entityType: "PRESCRIPTION",
      purpose: "operations",
      source: isPatient ? "user_portal" : "dashboard",
      metadata: { role, page, limit, returnedRecords: items.length }
    });

    return NextResponse.json({
      success: true,
      data: items,
      meta: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    }, { status: 200 });

  } catch (err: any) {
    console.error("GET /prescriptions error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
