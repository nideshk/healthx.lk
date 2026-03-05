import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { supabaseServer } from "@/lib/supabaseServer";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

export async function POST(request: NextRequest) {
    const { authorized, user } = await requireUser(request);
    if (!authorized || !user) {
        return NextResponse.json({ error: "User not authenticated." }, { status: 401 });
    }

    const patient_id = user.patient_id;

    if (!patient_id) {
        return NextResponse.json({ error: "User profile incomplete for payment processing." }, { status: 400 });
    }

    try {
        const body = await request.json();
        const {
            first_name, last_name, email, phone, address, city, country,
            appointment_id, practitioner_id, consultation_fee, platform_fee
        } = body;

        // Validation
        if (!first_name || !last_name || !email || !appointment_id || !practitioner_id) {
            return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
        }

        const supabase = await supabaseServer();

        // 1. Fetch Appointment from DB
        const { data: appt, error: apptError } = await supabase
            .from('appointments')
            .select('patient_id, fee_charged')
            .eq('id', appointment_id)
            .single();

        if (!appt || apptError) {
            return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
        }

        if (appt.patient_id !== patient_id) {
            return NextResponse.json({ error: "Unauthorized: Ownership mismatch." }, { status: 403 });
        }

        const formattedAmount = parseFloat(appt.fee_charged).toFixed(2);
        const orderID = appointment_id;

        // 2. Upsert Transaction
        const { error: dbError } = await supabase.from('transactions').upsert({
            order_id: orderID,
            status: 'pending',
            amount: formattedAmount,
            currency: 'LKR',
            customer_email: email,
            customer_name: `${first_name} ${last_name}`,
            customer_phone: phone,
            customer_address: address,
            customer_city: city,
            customer_country: country,
            patient_id: patient_id,
            appointment_id: appointment_id,
            practitioner_id: practitioner_id,
            consultation_fee: parseFloat(consultation_fee).toFixed(2),
            platform_fee: parseFloat(platform_fee).toFixed(2),
            updated_at: new Date().toISOString()
        }, { onConflict: 'order_id' });

        if (dbError) {
            console.error("DB Error:", dbError);
            return NextResponse.json({ error: "Database transaction failed." }, { status: 500 });
        }

        // 3. Audit Log
        const cnx = getAuditContext(request, user);
        await auditLog({
            ...cnx,
            action: "CREATED",
            entityType: "TRANSACTION",
            entityId: orderID,
            purpose: "operations",
            source: "user_portal",
            metadata: { amount: formattedAmount, appointment_id, provider: 'webxpay' }
        });

        return NextResponse.json({
            success: true,
            order_id: orderID,
            amount: formattedAmount
        });

    } catch (err: any) {
        console.error("Critical Error in /api/webxpay:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
