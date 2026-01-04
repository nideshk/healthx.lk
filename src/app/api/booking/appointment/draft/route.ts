// app/api/booking/appointment/draft/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

const supabase = supabaseClient;

export async function GET(req: NextRequest) {
  const { user, authorized } = await requireUser();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cnx = getAuditContext(req, user);
  const patientId = user?.patient_id;
  if (!patientId) return NextResponse.json({ error: "Only patients can have drafts" }, { status: 403 });

  const { data, error } = await supabase
    .from("appointment_draft")
    .select("*")
    .eq("patient_id", patientId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Draft fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await auditLog({
    ...cnx,
    action: "VIEWED",
    entityType: "APPOINTMENT_DRAFT",
    purpose: "operations",
    source: "user_portal",
    metadata: data ? { draft_id: data.id } : {}
  })
  return NextResponse.json({ success: true, draft: data || null });
}

export async function PATCH(req: NextRequest) {
  // Expect shape: { draft_id?: string|null, data: {...} }
  const body = await req.json();
  const { draft_id, data: newData } = body ?? {};

  const { user, authorized } = await requireUser();
  const cnx = getAuditContext(req, user);
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const patientId = user?.patient_id;
  if (!patientId) {
    await auditLog({
      ...cnx,
      action: "UNAUTHORIZED_ATTEMPT",
      entityType: "APPOINTMENT_DRAFT",
      purpose: "operations",
      source: "user_portal",
      metadata:{ data :  `no_patient_id : patient_id_missing`}
    })
    return NextResponse.json({ error: "Only patients can save drafts" }, { status: 403 });
  }

  if (!newData || typeof newData !== "object") {
    return NextResponse.json({ error: "Invalid 'data' payload" }, { status: 400 });
  }

  try {
    // If draft_id provided, attempt update (with ownership check)
    if (draft_id) {
      const { data, error } = await supabase
        .from("appointment_draft")
        .update({ data: newData })
        .eq("id", draft_id)
        .eq("patient_id", patientId)
        .select()
        .single();

      if (!error) {
        return NextResponse.json({ success: true, draft: data });
      }
    }

    const { data: upserted, error: upsertErr } = await supabase
      .from("appointment_draft")
      .upsert(
        {
          patient_id: patientId,
          data: newData,
        },
        { onConflict: "patient_id" }
      )
      .select()
      .single();

    if (upsertErr) {
      console.error("Upsert error:", upsertErr);
      return NextResponse.json({ error: upsertErr.message }, { status: 400 });
    }

    await auditLog({
      ...cnx,
      action: "UPDATED",
      entityType: "APPOINTMENT_DRAFT",
      entityId: upserted.id,
      purpose: "operations",
      source: "user_portal",
      metadata: { draft_id: upserted.id }
    })

    return NextResponse.json({ success: true, draft: upserted });
  } catch (err: any) {
    console.error("Unexpected error saving draft:", err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data: newData } = body ?? {};

  const { user, authorized } = await requireUser();
  const cnx = getAuditContext(req, user);

  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const patientId = user?.patient_id;
  if (!patientId){ 
    await auditLog({
      ...cnx,
      action: "UNAUTHORIZED_ATTEMPT",
      entityType: "APPOINTMENT_DRAFT",
      purpose: "operations",
      source: "user_portal",
      metadata:{ data :  `no_patient_id : patient_id_missing`}
    })
    return NextResponse.json({ error: "Only patients can create drafts" }, { status: 403 });
  }

  if (!newData || typeof newData !== "object") {
    return NextResponse.json({ error: "Invalid 'data' payload" }, { status: 400 });
  }

  try {
    const { data: created, error } = await supabase
      .from("appointment_draft")
      .upsert(
        {
          patient_id: patientId,
          data: newData,
        },
        { onConflict: "patient_id"}
      )
      .select()
      .single();

    if (error) {
      console.error("Insert upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await auditLog({
      ...cnx,
      action: "CREATED",
      entityType: "APPOINTMENT_DRAFT",
      entityId: created.id,
      purpose: "operations",
      source: "user_portal",
      metadata: { draft_id: created.id }
    })

    return NextResponse.json({ success: true, draft: created });
  } catch (err: any) {
    console.error("Unexpected create draft error:", err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
