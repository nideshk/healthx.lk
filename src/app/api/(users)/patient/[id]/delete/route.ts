import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

export async function DELETE(
  req: Request,
   context: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, user, response } = await requireUser();
    if (!authorized) return response;

    const patientId = (await context.params).id;


    if (!patientId) {
      return NextResponse.json(
        { success: false, message: "Patient ID required" },
        { status: 400 }
      );
    }

    /* ---------------- PRACTITIONER ---------------- */
    if (user?.role === "practitioner") {
      const practitionerId = user?.practitioner_id;

      if (!practitionerId) {
        return NextResponse.json(
          { success: false, message: "Practitioner context missing" },
          { status: 403 }
        );
      }
      const { error } = await supabaseAdmin
        .from("appointments")
        .update({
          patient_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("patient_id", patientId)
        .eq("practitioner_id", practitionerId);

      if (error) throw error;
      
      return NextResponse.json({
        success: true,
        message: "Patient removed from your appointments",
      });
    }

    /* ---------------- ADMIN / SUPERADMIN ---------------- */
    if (user?.role === "admin" || user?.role === "superadmin") {
      const deletedAt = new Date().toISOString();

      const { error: patientError } = await supabaseAdmin
        .from("patients")
        .update({
          is_active: false,
          deleted_at: deletedAt,
        })
        .eq("id", patientId);

      if (patientError) throw patientError;

      const { data: patient } = await supabaseAdmin
        .from("patients")
        .select("supabase_user_id")
        .eq("id", patientId)
        .single();

      if (patient?.supabase_user_id) {
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({
            is_active: false,
            deleted_at: deletedAt,
          })
          .eq("id", patient.supabase_user_id);

        if (profileError) throw profileError;
      }

      const cnx = getAuditContext(req as any, user);
      await auditLog({
        ...cnx,
        action: "DELETED",
        entityType: "PATIENT",
        entityId: patientId,
        metadata: {
          patientId,
          message : "Patient soft deleted by admin/superadmin",
          id : patientId
          }
      });


      return NextResponse.json({
        success: true,
        message: "Patient soft deleted successfully",
      });
    }

    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 }
    );
  } catch (err: any) {
    console.error("DELETE /patients/:id error:", err);
    return NextResponse.json(
      { success: false, message: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
