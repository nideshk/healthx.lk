import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest
    , context: { params: Promise<{ id: string }> }) {
    const { authorized, user } = await requireUser(req);
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });


    const cnx = getAuditContext(req, user);
    if (user?.profile?.role !== 'practitioner') {

        await auditLog({
            ...cnx,
            action: "FORBIDDEN_ACCESS_ATTEMPT",
            entityType: "TRANSACTION",
            entityId: (await context.params).id,
            purpose: "analytics",
            metadata: {
                description: `User ${user?.auth_user_id} with role ${user?.profile?.role} attempted to access practitioner transaction data.`,
            }
        })
        return NextResponse.json(
            { message: 'Access denied.' },
            { status: 403 }
        );
    }

    const { id: transactionId } = await context.params;
    const practionerId = user?.practitioner_id;


    if (!practionerId) {
        return NextResponse.json({ error: "Practitioner ID not found for the user" }, { status: 403 });
    }

    try {
        // Fetch the transaction by ID
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
                { message: 'Failed to fetch practitioner transactions.' },
                { status: 500 }
            );
        }

        if (!transaction) {
            return NextResponse.json({ message: 'Transaction not found.' }, { status: 404 });
        }

        if (String(transaction.practitioner_id) !== String(practionerId)) {
            await auditLog({
                ...cnx,
                action: "FORBIDDEN_ACCESS_ATTEMPT",
                entityType: "TRANSACTION",
                entityId: transactionId,
                purpose: "analytics",
                metadata: {
                    description: `Practitioner ${user?.auth_user_id} attempted to access transaction ${transactionId} not associated with them.`,
                }
            })
            console.warn(`SECURITY ALERT: Practitioner ${user.auth_user_id} attempted to access transaction ${transactionId} not associated with them.`);

            return NextResponse.json(
                { message: 'Transaction not found.' },
                { status: 404 }
            );
        }

        await auditLog({
            ...cnx,
            action: "VIEWED",
            entityType: "TRANSACTION",
            entityId: transactionId,
            purpose: "analytics",
            source: "dashboard",
            metadata: {
                transactionId
            }
        })

        return NextResponse.json({
            message: `Transaction fetched successfully`,
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

