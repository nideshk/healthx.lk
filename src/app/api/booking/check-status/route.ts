import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const appointmentId = searchParams.get('appointmentId');
    const { authorized, user } = await requireUser();

    if (!authorized) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!appointmentId) {
        return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }

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

        return NextResponse.json({ status: appointment.status, payment_status: appointment.payment_status });
    } catch (error) {
        console.error('Status check error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}