import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";
import { get } from "http";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

export const dynamic = "force-dynamic"; // Ensures dynamic execution (no caching)

// Endpoint: /api/analytics/transactions/patient/[transaction_id]
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { authorized, response, user } = await requireUser();
    if (!authorized) return response;

    if (user?.profile?.role !== 'patient') {
        return NextResponse.json(
            { message: 'Access denied.' },
            { status: 403 }
        );
    }

    const { id: transactionId } = await context.params;
    const patientId = user?.patient_id;


    if (!patientId) {
        return NextResponse.json({ error: "Patient ID not found for the user" }, { status: 403 });
    }

    console.log(`🔍 Fetching transactions for patient ID: ${patientId} (User: ${user?.auth_user_id}, Role: ${user?.role})`);

    try {
        
        const { data: transaction, error } = await supabaseClient
            .from("transactions")
            .select("*")
            .eq("id", transactionId)
            .single();

        if (error) {
            console.error('Database Error:', error);
            if (error.code === 'PGRST116') {
                return NextResponse.json({ message: 'Transaction not found.' }, { status: 404 });
            }
            return NextResponse.json(
                { message: 'Failed to fetch patient transactions.' },
                { status: 500 }
            );
        }

        if (!transaction) {
            return NextResponse.json({ message: 'Transaction not found.' }, { status: 404 });
        }

        if (String(transaction.patient_id) !== String(patientId)) {
            console.warn(`SECURITY ALERT: User ${user.auth_user_id} attempted to access transaction ${transactionId} belonging to patient ${transaction.patient_id}`);

            return NextResponse.json(
                { message: 'Transaction not found.' },
                { status: 404 }
            );
        }

        const cnx = getAuditContext(req, user);

        await auditLog({
            ...cnx,
            action: "VIEWED",
            entityType: "TRANSACTION",
            entityId: transactionId,
            purpose: "operations",
            source: "user_portal",
            metadata: { transactionId  }
            
        })

        return NextResponse.json({
            message: `Transaction fetched successfully.`,
            count: 1,
            data: transaction
        })

    } catch (error) {
        console.error('API Handler Error:', error);
        return NextResponse.json(
            { message: 'An internal server error occurred.' },
            { status: 500 }
        );
    }

}

