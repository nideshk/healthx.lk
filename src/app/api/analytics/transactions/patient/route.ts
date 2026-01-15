import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";
import { get } from "http";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const { authorized, response, user } = await requireUser(req);

    if (!authorized) return response;

    // Check if the user has the 'patient' role

    const cnx = getAuditContext(req, user);

    if (user?.profile?.role !== 'patient') {
        await auditLog({
            ...cnx,
            action: "FORBIDDEN_ACCESS_ATTEMPT",
            entityType: "TRANSACTION",
            purpose: "operations",
            source: "user_portal",
            metadata: { reason: "Non-patient role attempted access" }
        })
        return NextResponse.json(
            { message: 'Access denied.' },
            { status: 403 }
        );
    }

    const patientId = user?.patient_id;

    if (!patientId) {
        return NextResponse.json({ error: "Patient ID not found for the user" }, { status: 403 });
    }

    console.log(`🔍 Fetching transactions for patient ID: ${patientId} (User: ${user?.auth_user_id}, Role: ${user?.role})`);

    try {
        // Fetch all transactions for the patient using their patient ID
        const { data: transactions, error } = await supabaseClient
            .from("transactions")
            .select("*")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error('Database Error:', error);
            return NextResponse.json(
                { message: 'Failed to fetch patient transactions.' },
                { status: 500 }
            );
        }

        await auditLog({
            ...cnx,
            action: "VIEWED",
            entityType: "TRANSACTION",
            purpose: "operations",
            source: "user_portal",
            metadata: {
                message: "Patient transactions fetched successfully.",
                count: transactions?.length || 0,
                data: transactions || []
            }
        })

        return NextResponse.json({
            message: "Patient transactions fetched successfully.",
            count: transactions?.length || 0,
            data: transactions || []
        })

    } catch (error) {
        console.error('API Handler Error:', error);
        return NextResponse.json(
            { message: 'An internal server error occurred.' },
            { status: 500 }
        );
    }
}

