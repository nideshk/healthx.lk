import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";
import { supabaseClient } from "@/lib/supabaseClient";

export async function GET(req: NextRequest) {
    try {
        /* ---------------- AUTH ---------------- */
        const { authorized, user } = await requireUser(req);
        const cnx = getAuditContext(req, user);

        if (!authorized) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const patientId = user?.patient_id;
        if (!patientId) {
            await auditLog({
                ...cnx,
                action: "FAILED",
                source: "dashboard",
                entityType: "PENDING_REVIEW",
                entityId: user?.auth_user_id,
                metadata: {
                    error: "No patient profile found",
                    "user_id": user?.auth_user_id,
                },
                purpose: "operations",
            })
            return NextResponse.json(
                { error: "No patient profile found" },
                { status: 400 }
            );
        }

        /* ---------------- QUERY ---------------- */
        const { data, error } = await supabaseClient
            .from("appointments")
            .select(`
        id,
        ends_at,
        practitioner_id,
        practitioners (id, full_name),
        appointment_reviews ( id )
      `)
            .eq("patient_id", patientId)
            .eq("status", "completed")
            .lt("ends_at", new Date().toISOString())
            .is("reviewed_at", null)
            .order("ends_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            await auditLog({
                ...cnx,
                action: "FAILED",
                source: "dashboard",
                entityType: "PENDING_REVIEW",
                entityId: user?.auth_user_id,
                metadata: {
                    error: error.message,
                    "user_id": user?.auth_user_id,
                },
                purpose: "operations",
            })
            console.error("Pending review fetch error:", error);
            return NextResponse.json(
                { error: "Failed to fetch pending review" },
                { status: 500 }
            );
        }

        /* ---------------- RESPONSE ---------------- */
        if (!data) {
            return NextResponse.json({
                pending: false,
                appointment: null,
            });
        }

        const practitioner =
            Array.isArray(data.practitioners)
                ? data.practitioners[0]
                : data.practitioners;

        const practitionerName = practitioner?.full_name ?? "";

        await auditLog({
            ...cnx,
            action: "CREATED",
            source: "dashboard",
            entityType: "PENDING_REVIEW",
            entityId: user?.auth_user_id,
            metadata: {
                "user_id": user?.auth_user_id,
            },
            purpose: "operations",
        })
        return NextResponse.json({
            pending: true,
            appointment: {
                practitioner_name: practitionerName,
                appointment_id: data.id,
                practitioner_id: data.practitioner_id,
            },
        });
    } catch (err: any) {
        console.error("Pending review API error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
