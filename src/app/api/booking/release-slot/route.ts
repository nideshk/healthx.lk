import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

export async function POST(req: NextRequest) {
    try {
        const { authorized, user } = await requireUser(req);
        const cnx = getAuditContext(req, user);
        if (!authorized || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { appointmentId, reason } = await req.json();

        if (!appointmentId) {
            return NextResponse.json({ error: "Missing Appointment ID" }, { status: 400 });
        }

        let finalStatus = 'cancelled';
        switch(reason)
        {
            case "PAYMENT_FAILED":
                finalStatus = 'payment_failed';
                break;
            
            case "PAYMENT_DISMISSED":
                finalStatus = 'payment_cancelled';
                break;
        }

        // 1. Update the Appointment status to release the slot
        const { error: appError } = await supabaseAdmin
            .from('appointments')
            .update({
                status: finalStatus,
                payment_status: 'failed'
            })
            .eq('id', appointmentId)
            .eq('patient_id', user?.patient_id)
            .eq('status', 'pending'); // Cancel if it hasn't been confirmed yet

        if (appError) throw appError;

        // 2. Update the corresponding Transaction record
        const { error: txError } = await supabaseAdmin
            .from('transactions')
            .update({
                status: 'failed',
                updated_at: new Date().toISOString()
            })
            .eq('order_id', appointmentId)
            .eq('patient_id', user?.patient_id)
            .neq('status', 'paid'); // Never cancel a transaction that succeeded

        if (txError) {
            console.error("Transaction update failed during release:", txError);
        }

        await auditLog({
            ...cnx,
            action: "UPDATED",
            entityType: "APPOINTMENT",
            entityId: appointmentId,
            purpose: "operations",
            source: "user_portal",
            metadata: { appointment_id: appointmentId, action: "slot_released" }
        })
        return NextResponse.json({ success: true, message: "Slot and transaction released." });
    } catch (err: any) {
        console.error("Release slot error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}