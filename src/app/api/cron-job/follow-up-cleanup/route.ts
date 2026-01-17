import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auditLog } from "@/lib/audit/auditLog";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    try {
        const now = new Date().toISOString();

        /* ---------------------------------------
           1️⃣ Find expired appointments
        --------------------------------------- */
        const { data: expired, error } = await supabaseAdmin
            .from("appointments")
            .update({
                status: "cancelled",
                cancellation_reason: "expired",
                cancelled_at: now,
                updated_at: now
            })
            .eq("status", "pending")
            .eq("payment_status", "pending")
            .lt("expires_at", now)
            .select("id, patient_id, practitioner_id");

        if (error) {
            console.error("❌ Failed to expire appointments:", error);
            return NextResponse.json(
                { error: "Failed to expire appointments" },
                { status: 500 }
            );
        }

        /* ---------------------------------------
           2️⃣ Audit (aggregate, not per row)
        --------------------------------------- */
        if (expired && expired.length > 0) {
            await auditLog({
                actorRole: "system",
                actorUserId: "c07d23a1-01cb-4846-9829-9f9760df8078",
                action: "SYSTEM_CANCELLED",
                entityType: "APPOINTMENT",
                entityId: "BULK_EXPIRE",
                purpose: "operations",
                source: "cron",
                metadata: {
                    count: expired.length,
                    appointment_ids: expired.map(a => a.id)
                }
            });
        }

        return NextResponse.json({
            success: true,
            expired_count: expired?.length || 0
        });

    } catch (err) {
        console.error("❌ Cron error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
