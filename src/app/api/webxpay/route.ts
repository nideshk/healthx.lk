import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { supabaseServer } from "@/lib/supabaseServer";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    const requestId = crypto.randomUUID();

    console.log("[API][REQUEST]", {
        requestId,
        method: request.method,
        url: request.url,
        timestamp: new Date().toISOString()
    });

    const { authorized, user } = await requireUser(request);
    if (!authorized || !user) {
        console.log("[AUTH][FAILURE]", { requestId, timestamp: new Date().toISOString() });
        return NextResponse.json({ error: "User not authenticated." }, { status: 401 });
    }

    const patient_id = user.patient_id;

    if (!patient_id) {
        console.log("[API][ERROR]", { requestId, message: "User profile incomplete", userId: user.auth_user_id });
        return NextResponse.json({ error: "User profile incomplete for payment processing." }, { status: 400 });
    }

    try {
        const body = await request.json();
        const {
            first_name, last_name, email, phone, address, city, country,
            appointment_id, practitioner_id, consultation_fee, platform_fee
        } = body;

        console.log("[API][PARAMS]", {
            requestId,
            appointment_id,
            practitioner_id,
            patient_id,
            timestamp: new Date().toISOString()
        });

        // Validation
        if (!first_name || !last_name || !email || !appointment_id || !practitioner_id) {
            console.log("[API][VALIDATION_ERROR]", { requestId, missingFields: true });
            return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
        }

        const supabase = await supabaseServer();

        // 1. Fetch Appointment from DB
        console.log("[DB][QUERY_START]", {
            requestId,
            table: "appointments",
            filter: { id: appointment_id }
        });

        const { data: appt, error: apptError } = await supabase
            .from('appointments')
            .select('patient_id, fee_charged')
            .eq('id', appointment_id)
            .single();

        console.log("[DB][QUERY_RESULT]", {
            requestId,
            data: appt,
            error: apptError
        });

        if (apptError) {
            console.error("[DB][ERROR]", {
                requestId,
                code: apptError.code,
                message: apptError.message,
                details: apptError.details,
                hint: apptError.hint,
                appointment_id
            });
            return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
        }

        if (!appt) {
            return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
        }

        if (appt.patient_id !== patient_id) {
            console.log("[API][AUTH_ERROR]", { requestId, message: "Ownership mismatch", apptPatientId: appt.patient_id, sessionPatientId: patient_id });
            return NextResponse.json({ error: "Unauthorized: Ownership mismatch." }, { status: 403 });
        }

        const formattedAmount = parseFloat(appt.fee_charged).toFixed(2);
        const orderID = appointment_id;

        // 2. Upsert Transaction
        console.log("[DB][QUERY_START]", {
            requestId,
            table: "transactions",
            action: "upsert",
            order_id: orderID
        });

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

        console.log("[DB][QUERY_RESULT]", {
            requestId,
            error: dbError
        });

        if (dbError) {
            console.error("[DB][ERROR]", {
                requestId,
                code: dbError.code,
                message: dbError.message,
                details: dbError.details,
                hint: dbError.hint,
                order_id: orderID
            });
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

        const pemKey = publicKey.replace(/\\n/g, '\n').trim();
        const inputToEncrypt = `${orderID}|${formattedAmount}`;

        // Use crypto.publicEncrypt directly with the PEM key string as requested
        const encryptedPayment = crypto.publicEncrypt(
            {
                key: pemKey,
                padding: crypto.constants.RSA_PKCS1_PADDING,
            },
            Buffer.from(inputToEncrypt, 'utf8')
        ).toString('base64');

        // Clean phone: Remove all characters except digits and +
        const cleanPhone = phone ? phone.replace(/[^\d+]/g, '') : "0000000000";

        // Base64 encode the custom fields
        const encodedCustomFields = Buffer.from(appointment_id).toString("base64");

        const responseData = {
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
                country: country || "Sri Lanka",
                process_currency: "LKR",
                cms: "PHP",
                custom_fields: encodedCustomFields,
                custom_feilds: encodedCustomFields, // Intentional typo fallback for WebXPay
                total_amount: formattedAmount,
                payment: encryptedPayment,
                api_user: process.env.WEBXPAY_API_KEY,
                secret_key: process.env.WEBXPAY_SECRET_KEY,
                enc_method: process.env.WEBXPAY_ENC_METHOD
            }
        };

        console.log("[API][RESPONSE]", {
            requestId,
            status: 200,
            appointment_id: orderID
        });

        return NextResponse.json(responseData);

    } catch (err: any) {
        console.error("[API][FATAL_ERROR]", {
            requestId,
            error: err,
            message: err?.message,
            stack: err?.stack
        });
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
