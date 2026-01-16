import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import crypto from 'crypto';
import { supabaseServer } from "@/lib/supabaseServer";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
    const { authorized, user } = await requireUser(request);
    console.log("user", user)
    if (!authorized || !user) {
        console.log("Unauthorized access attempt to /api/payhere");
        return NextResponse.json({ error: "User not authenticated." }, { status: 401 });
    }

    const patient_id = user.patient_id;

    if (!patient_id) {
        console.log("User missing patient_id:", user.auth_user_id);
        return NextResponse.json({ error: "User profile incomplete for payment processing." }, { status: 400 });
    }

    try {
        const MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID!;
        const MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET!;
        const currency = process.env.PAYHERE_CURRENCY || 'LKR';
        const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const NGROK_URL = process.env.NGROK_URL;
        const PAYHERE_RETURN_PATH = process.env.PAYHERE_RETURN_PATH;
        const PAYHERE_CANCEL_PATH = process.env.PAYHERE_CANCEL_PATH;
        const PAYHERE_NOTIFY_PATH = process.env.PAYHERE_NOTIFY_PATH;

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

        // 1. Fetch Appointment from DB (The Source of Truth)
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

        // --- AMOUNT LOGGING SECTION ---
        const rawDbAmount = appt.fee_charged;
        const formattedAmount = parseFloat(rawDbAmount).toFixed(2);
        const orderID = appointment_id;

        // 2. Upsert Transaction
        const { error: dbError } = await supabase.from('transactions').upsert({
            order_id: orderID,
            status: 'pending',
            amount: formattedAmount,
            currency: currency,
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

        // 3. Generate PayHere MD5 Hash
        // Important: PayHere expects Uppercase MD5 of Secret + rest of the string
        const hashedSecret = crypto.createHash('md5').update(MERCHANT_SECRET).digest('hex').toUpperCase();

        const hash = crypto
            .createHash('md5')
            .update(
                MERCHANT_ID +
                orderID +
                formattedAmount +
                currency +
                hashedSecret
            )
            .digest('hex')
            .toUpperCase();

        const publicDomain = NGROK_URL || BASE_URL;
        const notifyUrl = `${publicDomain}${PAYHERE_NOTIFY_PATH}`;

        const payHerePayload = {
            sandbox: process.env.NODE_ENV !== 'production',
            merchant_id: MERCHANT_ID,
            return_url: `${BASE_URL}${PAYHERE_RETURN_PATH}`,
            cancel_url: `${BASE_URL}${PAYHERE_CANCEL_PATH}`,
            notify_url: notifyUrl,
            first_name,
            last_name,
            email,
            phone,
            address,
            city,
            country,
            amount: formattedAmount,
            currency,
            order_id: orderID,
            hash: hash,
            items: `Medical Consultation (Ref: ${orderID})`
        };

        // 4. Audit Log
        const cnx = getAuditContext(request, user);
        await auditLog({
            ...cnx,
            action: "CREATED",
            entityType: "TRANSACTION",
            entityId: orderID,
            purpose: "operations",
            source: "user_portal",
            metadata: { amount: formattedAmount, appointment_id }
        });

        return NextResponse.json({ payment: payHerePayload });

    } catch (err: any) {
        console.error("Critical Error in /api/payhere:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}