import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";

export async function POST(req: Request) {
    try {
        const { authorized, user } = await requireUser();

        if (!authorized || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { appointmentId } = await req.json();

        if (!appointmentId) {
            return NextResponse.json({ error: "Missing Appointment ID" }, { status: 400 });
        }

        // 1. Update the Appointment status to release the slot
        const { error: appError } = await supabaseAdmin
            .from('appointments')
            .update({
                status: 'cancelled',
                payment_status: 'failed'
            })
            .eq('id', appointmentId)
            .eq('status', 'scheduled'); // Cancel if it hasn't been confirmed yet

        if (appError) throw appError;

        // 2. Update the corresponding Transaction record
        const { error: txError } = await supabaseAdmin
            .from('transactions')
            .update({
                status: 'failed',
                updated_at: new Date().toISOString()
            })
            .eq('order_id', appointmentId)
            .neq('status', 'paid'); // Never cancel a transaction that succeeded

        if (txError) {
            console.error("Transaction update failed during release:", txError);
        }
        return NextResponse.json({ success: true, message: "Slot and transaction released." });
    } catch (err: any) {
        console.error("Release slot error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}