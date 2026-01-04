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
            .neq('source', 'admin') // donot delete appointments created by admin
            .select();

        console.log("Expired appointments : ", updatedAppoitments);

        if (apptUpdateError) {
            throw apptUpdateError;
        }

        const cancelledAppointmentIds = updatedAppoitments?.map(x => x.id) || [];
        let cancelledTransactionsCount = 0;

        if (cancelledAppointmentIds.length > 0) {
            // Update stale transactions which were related to above cancelled appointments
            const { data: updatedTransactions, error: transactionUpdateError } = await supabaseAdmin
                .from("transactions")
                .update({ status: 'failed' })
                .eq('status', 'pending')
                .lt('created_at', expiryTime)
                .in('appointment_id', cancelledAppointmentIds)
                .select();

            if (transactionUpdateError) {
                throw transactionUpdateError;
            }

            cancelledTransactionsCount = updatedTransactions?.length || 0;
        }

        return NextResponse.json({
            success: true,
            releasedAppointments: updatedAppoitments?.length || 0,
            releasedTransactions: cancelledTransactionsCount || 0,
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