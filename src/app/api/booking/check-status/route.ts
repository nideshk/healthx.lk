import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";
import { getCleanUUID } from "@/utils/uuidUtils";

export async function GET(req: NextRequest) {
    const requestId = crypto.randomUUID();
    const { searchParams } = new URL(req.url);
    const rawId = searchParams.get('appointmentId');
    const appointmentId = getCleanUUID(rawId || "");

    console.log("[API][REQUEST]", {
        requestId,
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString()
    });

    console.log("[API][PARAMS]", {
        requestId,
        rawId,
        appointmentId,
        type: typeof rawId
    });

    const { authorized, user } = await requireUser(req);
    const cnx = getAuditContext(req, user);
    if (!authorized) {
        console.log("[AUTH][FAILURE]", { requestId, timestamp: new Date().toISOString() });
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!rawId) {
        console.log("[API][VALIDATION_ERROR]", { requestId, error: "Appointment ID is required" });
        return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }

    try {
        console.log("[DB][QUERY_START]", {
            requestId,
            table: "appointments",
            filter: { id: appointmentId }
        });

        const { data: appointment, error } = await supabaseAdmin
            .from('appointments')
            .select('payment_status, status')
            .eq('id', appointmentId)
            .single();

        console.log("[DB][QUERY_RESULT]", {
            requestId,
            data: appointment,
            error: error
        });

        if (error || !appointment) {
            console.error("[DB][ERROR]", {
                requestId,
                code: error?.code,
                message: error?.message,
                details: error?.details,
                hint: error?.hint,
                appointmentId
            });
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
        }

        await auditLog({
            ...cnx,
            action: "CHECKED_STATUS",
            entityType: "APPOINTMENT",
            entityId: appointmentId,
            purpose: "operations",
            source: "user_portal",
            metadata: { appointment_id: appointmentId }
        })

        console.log("[API][RESPONSE]", {
            requestId,
            status: 200,
            response: { status: appointment.status, payment_status: appointment.payment_status }
        });

        return NextResponse.json({ status: appointment.status, payment_status: appointment.payment_status });
    } catch (error: any) {
        console.error("[API][FATAL_ERROR]", {
            requestId,
            error: error,
            message: error?.message,
            stack: error?.stack
        });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}