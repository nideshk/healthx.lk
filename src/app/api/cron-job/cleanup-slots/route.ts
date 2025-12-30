import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(reques: NextRequest) {

    try {
        const expiryTime = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // 15 minutes older
        console.log("Expiry Time: ", expiryTime);

        // Update stale appointments
        const { data: updatedAppoitments, error: apptUpdateError } = await supabaseAdmin
            .from("appointments")
            .update({ status: 'cancelled', payment_status: 'failed' })
            .eq('status', 'pending')
            .lt('created_at', expiryTime)
            .select();

        console.log("Expired appointments : ", updatedAppoitments);

        if (apptUpdateError) {
            throw apptUpdateError;
        }

        // Update stale transactions
        const { data: updatedTransactions, error: transactionUpdateError } = await supabaseAdmin
            .from("transactions")
            .update({ status: 'failed' })
            .eq('status', 'pending')
            .lt('created_at', expiryTime)
            .select();

        if (transactionUpdateError) {
            throw transactionUpdateError;
        }

        return NextResponse.json({
            success: true,
            releasedAppointments: updatedAppoitments?.length || 0,
            releasedTransactions: updatedTransactions?.length || 0,
            processedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Appointments/Transactions cleanup cron failed:", error);
        return NextResponse.json(
            { error: "Cleanup slots cron job failed" },
            { status: 500 }
        );
    }
}