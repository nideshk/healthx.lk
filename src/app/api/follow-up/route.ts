import { auditLog } from "@/lib/audit/auditLog";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { requireUser } from "@/lib/authGuard";
import { logAuditEvent } from "@/lib/logAuditEvent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  try {
    /* ---------------------------------------------------------
       1️⃣ Authentication
    --------------------------------------------------------- */
    const { user } = await requireUser();
    const cnx = getAuditContext(_req, user);
    if (!user?.auth_user_id || !user?.patient_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ---------------------------------------------------------
       2️⃣ Fetch follow-ups with FULL context
    --------------------------------------------------------- */
    const { data, error } = await supabaseAdmin
      .from("encounters")
      .select(`
        id,
        follow_up_needed,
        follow_up_date,
        created_at,
        updated_at,
        clinician_notes,
        prescriptions,
        appointment:appointments (
          id,
          starts_at,
          ends_at,

          practitioner:practitioners (
            id,
            full_name,
            specialization
          )
        )
      `)
      .eq("patient_id", user.patient_id)
      .eq("follow_up_needed", true)
      .order("follow_up_date", { ascending: true });

    if (error) {
      console.error("❌ Failed to fetch follow-ups:", error);
      return NextResponse.json(
        { error: "Failed to fetch follow-up data" },
        { status: 500 }
      );
    }

    /* ---------------------------------------------------------
       3️⃣ Audit log (non-blocking)
    --------------------------------------------------------- */
   
    await auditLog({
      ...cnx,
      action: "VIEWED",
      entityType: "FOLLOW_UP_DATA",
      entityId: user.patient_id,
      purpose: "operations",
      source: "dashboard",
      metadata: {
        data : data,
        follow_up_count: data?.length || 0
      }
    })

    /* ---------------------------------------------------------
       4️⃣ Response
    --------------------------------------------------------- */
    return NextResponse.json({ data: data ?? [] }, { status: 200 });

  } catch (err) {
    console.error("❌ Unexpected error in follow-up GET:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
