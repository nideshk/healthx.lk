import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { supabaseServer } from "@/lib/supabaseServer";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";
import crypto from 'crypto';

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
        // const formattedAmount = "50.00"; // Changed this for testing as webxpay doesn't support large amounts during testing
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

        const publicKey = process.env.WEBXPAY_PUBLIC_KEY;
        if (!publicKey) throw new Error("WEBXPAY_PUBLIC_KEY is not defined");

        // More robust key reconstruction
        const pemKey = publicKey.replace(/\\n/g, '\n').trim();

        const inputToEncrypt = `${orderID}|${formattedAmount}`;

        // Using createPublicKey allows OpenSSL 3 to handle the decoding more intelligently
        const encryptedPayment = crypto.publicEncrypt(
            {
                key: crypto.createPublicKey(pemKey),
                padding: crypto.constants.RSA_PKCS1_PADDING,
            },
            Buffer.from(inputToEncrypt)
        ).toString('base64');

        const cleanPhone = phone ? phone.replace(/[^\d+]/g, '') : "0000000000";

        return NextResponse.json({
            success: true,
            order_id: orderID,
            total_amount: formattedAmount,
            payment_fields: {
                first_name,
                last_name,
                email,
                contact_number: cleanPhone,
                address_line_one: address || "Default Address",
                city: city || "Colombo",
                state: "Western",
                postal_code: "10300",
                country: country || "Sri Lanka",
                process_currency: "LKR",
                cms: "PHP",
                custom_fields: appointment_id,
                total_amount: formattedAmount,
                payment: encryptedPayment,
                api_user: process.env.WEBXPAY_API_KEY,
                secret_key: process.env.WEBXPAY_SECRET_KEY,
                enc_method: process.env.WEBXPAY_ENC_METHOD
            }
        });

    } catch (err: any) {
        console.error("Critical Error in /api/webxpay:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
