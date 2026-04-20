import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";
import { getCleanUUID } from "@/utils/uuidUtils";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const rawId = searchParams.get('appointmentId');
    const { authorized, user } = await requireUser(req);
    const cnx = getAuditContext(req, user);
    if (!authorized) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!rawId) {
        return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }

    const appointmentId = getCleanUUID(rawId);

    try {
        const { data: appointment, error } = await supabaseAdmin
            .from('appointments')
            .select('payment_status, status')
            .eq('id', appointmentId)
            .single();

        if (error || !appointment) {
            console.error('Supabase error:', error);
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
        return NextResponse.json({ status: appointment.status, payment_status: appointment.payment_status });
    } catch (error) {
        console.error('Status check error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}