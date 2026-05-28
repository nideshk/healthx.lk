import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from 'crypto';
import { notify } from "@/lib/notify";
import { sendAppointmentInvites } from '@/lib/additional_attendee/appointmentInvites';
import { getCleanUUID } from "@/utils/uuidUtils";
import { fulfillAppointment } from "@/lib/payments/fulfillmentService";

export async function POST(request: NextRequest) {
    const requestId = crypto.randomUUID();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    let appointment_id = "";

    try {
        const formData = await request.formData();
        const searchParams = request.nextUrl.searchParams;
        const getParam = (key: string) => formData.get(key) || searchParams.get(key);

        const status_code = formData.get('status_code');
        const order_id = formData.get('order_id') as string;
        appointment_id = (formData.get('custom_fields') as string) || "";

        // Decode the appointment_id if it's in base64 format
        appointment_id = getCleanUUID(appointment_id);

        console.log("[WEBX][WEBHOOK_RECEIVED]", {
            requestId,
            headers: Object.fromEntries(request.headers.entries()),
            body: Object.fromEntries(formData.entries()),
            timestamp: new Date().toISOString()
        });

        let signature = getParam('signature') as string;
        let paymentBase64 = getParam('payment') as string;

        if (signature) signature = signature.replace(/ /g, '+');
        if (paymentBase64) paymentBase64 = paymentBase64.replace(/ /g, '+');

        const isSuccess = (status_code === '0' || status_code === '00');

        if (isSuccess && (!signature || !paymentBase64)) {
            console.error("[WEBX][WEBHOOK_ERROR]", {
                requestId,
                error: "Missing critical payment data",
                formDataKeys: Array.from(formData.keys())
            });
            return NextResponse.json({ error: "Data missing" }, { status: 400 });
        }

        if(isSuccess)
        {
            const rawPaymentData = Buffer.from(paymentBase64, 'base64').toString('utf8');
            const publicKey = process.env.WEBXPAY_PUBLIC_KEY;

            if (!publicKey) {
                console.error("[WEBX][WEBHOOK_ERROR]", {
                    requestId,
                    error: "Public key not configured"
                });
                return NextResponse.json({ error: "Verification failed" }, { status: 500 });
            }

            let pemKey = publicKey?.replace(/\\n/g, '\n').replace(/"/g, '').trim();

            if (!pemKey.includes('-----BEGIN PUBLIC KEY-----')) {
                pemKey = `-----BEGIN PUBLIC KEY-----\n${pemKey}\n-----END PUBLIC KEY-----`;
            }

            let decryptedSignature = "";

            try {
                const keyObject = crypto.createPublicKey({
                    key: pemKey,
                    format: 'pem',
                });

                decryptedSignature = crypto.publicDecrypt(
                    {
                        key: keyObject,
                        padding: crypto.constants.RSA_PKCS1_PADDING,
                    },
                    Buffer.from(signature, 'base64')
                ).toString('utf8').replace(/\0/g, '');
            } catch (decryptionError) {
                console.error("[WEBX][WEBHOOK_ERROR]", {
                    requestId,
                    error: "Signature Decryption Failed",
                    detail: decryptionError
                });
                return NextResponse.json({ error: "Verification failed" }, { status: 403 });
            }

            if (rawPaymentData.trim() !== decryptedSignature.trim()) {
                console.error("[WEBX][WEBHOOK_ERROR]", {
                    requestId,
                    error: "SECURITY ALERT: Signature Mismatch!",
                    rawPaymentData,
                    decryptedSignature
                });
                return NextResponse.json({ error: "Invalid Signature" }, { status: 403 });
            }
        }

        const supabase = await supabaseAdmin;

        if (isSuccess) {

            await fulfillAppointment({order_id, requestId});
            console.log("[API][RESPONSE]", {
                requestId,
                status: "redirect_success",
                appointment_id
            });

            return NextResponse.redirect(`${baseUrl}/dashboard/appointment/status?appointmentId=${appointment_id}&payment=success`, 303);
        }
        else {
            console.log("[DB][QUERY_START]", {
                requestId,
                action: "batch_update_failed_status",
                order_id
            });

            const [txRes, appRes] = await Promise.all([
                supabase
                    .from('transactions')
                    .update({ status: 'failed', updated_at: new Date().toISOString() })
                    .eq('order_id', order_id)
                    .neq('status', 'paid'),
                supabase
                    .from('appointments')
                    .update({ status: "payment_failed", payment_status: "failed" })
                    .eq('id', order_id)
                    .eq('status', 'pending')
            ]);

            console.log("[DB][QUERY_RESULT]", {
                requestId,
                txResError: txRes.error,
                appResError: appRes.error
            });

            if (txRes.error) {
                console.error("[DB][ERROR]", {
                    requestId,
                    message: "Transaction Update Error",
                    error: txRes.error
                });
                throw new Error("Transaction update failed.");
            }

            if (appRes.error) {
                console.error("[DB][ERROR]", {
                    requestId,
                    message: "Appointment Update Error",
                    error: appRes.error
                });
                throw new Error("Appointment update failed.");
            }

            console.log("[API][RESPONSE]", {
                requestId,
                status: "redirect_failed",
                appointment_id
            });

            return NextResponse.redirect(`${baseUrl}/dashboard/appointment/status?appointmentId=${appointment_id}&payment=failed`, 303);
        }
    }
    catch (error) {
        console.error("[API][FATAL_ERROR]", {
            requestId,
            error: error,
            message: (error as any)?.message,
            stack: (error as any)?.stack
        });
        const redirectPath = appointment_id ? `/dashboard/appointment/status?appointmentId=${appointment_id}&payment=error` : '/dashboard/appointment';
        return NextResponse.redirect(`${baseUrl}${redirectPath}`, 303);
    }
}