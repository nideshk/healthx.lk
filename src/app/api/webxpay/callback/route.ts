import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from 'crypto';
import { notify } from "@/lib/notify";
import { sendAppointmentInvites } from '@/lib/additional_attendee/appointmentInvites';
import { getCleanUUID } from "@/utils/uuidUtils";
import { fulfillAppointment } from "@/lib/payments/fulfillmentService";
import {
    pendingFailureMatchesCallback,
    readSignedCallbackPayment,
    verifyWebxpaySignature,
} from "@/lib/payments/webxpaySignature";

function callbackReference(...candidates: Array<string | null | undefined>): string {
    for (const candidate of candidates) {
        if (typeof candidate !== "string") continue;
        const value = candidate.trim();
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
            return value;
        }
        if (/^[A-Za-z0-9_-]{1,64}$/.test(value)) return value;
    }
    return "";
}

function callbackStatusCode(status: FormDataEntryValue | null): string {
    if (typeof status !== "string") return "";
    const value = status.trim();
    return /^-?\d{1,3}$/.test(value) ? value : "";
}

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

        let signature = getParam('signature') as string;
        let paymentBase64 = getParam('payment') as string;

        if (signature) signature = signature.replace(/ /g, '+');
        if (paymentBase64) paymentBase64 = paymentBase64.replace(/ /g, '+');

        const isSuccess = (status_code === '0' || status_code === '00');

        const verification = verifyWebxpaySignature({
            signature,
            paymentBase64,
            publicKey: process.env.WEBXPAY_PUBLIC_KEY,
        });

        const reference = callbackReference(
            verification.ok ? readSignedCallbackPayment(verification.rawPaymentData).orderId : "",
            order_id,
            appointment_id
        );

        console.log("[WEBX][WEBHOOK]", {
            reference,
            status_code: callbackStatusCode(status_code),
            signatureVerified: verification.ok,
        });

        if (!verification.ok) {
            console.warn("[WEBX][SIGNATURE_REJECTED]", { reference });

            if (isSuccess) {
                if (verification.reason === "missing") {
                    return NextResponse.json({ error: "Data missing" }, { status: 400 });
                }
                if (verification.reason === "no_key") {
                    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
                }
                if (verification.reason === "decrypt_failed") {
                    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
                }
                return NextResponse.json({ error: "Invalid Signature" }, { status: 403 });
            }

            return NextResponse.json({ error: "Invalid Signature" }, { status: 403 });
        }

        const signed = readSignedCallbackPayment(verification.rawPaymentData);

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
            const formOrderId = typeof order_id === "string" ? order_id.trim() : "";
            const supabase = await supabaseAdmin;
            const { data: pending, error: pendingError } = await supabase
                .from('transactions')
                .select('order_id, status')
                .eq('order_id', signed.orderId)
                .eq('status', 'pending')
                .maybeSingle();

            if (pendingError || !pendingFailureMatchesCallback({ signed, formOrderId, pending })) {
                console.warn("[WEBX][CALLBACK_MISMATCH]", {
                    reference: callbackReference(signed.orderId, reference),
                });
                return NextResponse.redirect(`${baseUrl}/dashboard/appointment/status?appointmentId=${appointment_id}&payment=failed`, 303);
            }

            console.log("[DB][QUERY_START]", {
                requestId,
                action: "batch_update_failed_status",
                order_id: signed.orderId
            });

            const [txRes, appRes] = await Promise.all([
                supabase
                    .from('transactions')
                    .update({ status: 'failed', updated_at: new Date().toISOString() })
                    .eq('order_id', signed.orderId)
                    .eq('status', 'pending'),
                supabase
                    .from('appointments')
                    .update({ status: "payment_failed", payment_status: "failed" })
                    .eq('id', signed.orderId)
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
