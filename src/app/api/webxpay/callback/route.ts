import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from 'crypto';
import { notify } from "@/lib/notify";
import { sendAppointmentInvites } from '@/lib/additional_attendee/appointmentInvites';

export async function POST(request: NextRequest) {
    const requestId = crypto.randomUUID();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    let appointment_id = "";

    try 
    {
        const formData = await request.formData();
        const searchParams = request.nextUrl.searchParams;
        const getParam = (key: string) => formData.get(key) || searchParams.get(key);

        const status_code = formData.get('status_code');
        const order_id = formData.get('order_id');
        appointment_id = (formData.get('custom_fields') as string) || "";

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

        if (!signature || !paymentBase64) {
            console.error("[WEBX][WEBHOOK_ERROR]", {
                requestId,
                error: "Missing critical payment data",
                formDataKeys: Array.from(formData.keys())
            });
            return NextResponse.json({ error: "Data missing" }, { status: 400 });
        }
        
        const rawPaymentData = Buffer.from(paymentBase64, 'base64').toString('utf8');
        const publicKey = process.env.WEBXPAY_PUBLIC_KEY;

        if(!publicKey) {
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

        const supabase = await supabaseAdmin;
        
        if (status_code === '0' || status_code === '00') 
        {
            // Check if Appointment is already confirmed (Idempotency)
            console.log("[DB][QUERY_START]", {
                requestId,
                table: "appointments",
                action: "select",
                order_id
            });

            const { data: currentApp, error: fetchCurrentError } = await supabaseAdmin
                .from('appointments')
                .select('status, payment_status')
                .eq('id', order_id)
                .single();
            
            console.log("[DB][QUERY_RESULT]", {
                requestId,
                data: currentApp,
                error: fetchCurrentError
            });

            if (currentApp?.status === 'confirmed' && currentApp?.payment_status == 'paid') {
                console.log("[API][RESPONSE]", {
                    requestId,
                    status: "redirect_success_idempotent",
                    order_id
                });
                return NextResponse.redirect(`${baseUrl}/dashboard/appointment/status?appointmentId=${appointment_id}&payment=success`, 303);
            }

            console.log("[DB][QUERY_START]", {
                requestId,
                action: "batch_update_payment_status",
                order_id
            });

            const [txRes, appRes] = await Promise.all([
                supabase
                    .from('transactions')
                    .update({ status: 'paid', updated_at: new Date().toISOString() })
                    .eq('order_id', order_id)
                    .neq('status', 'paid'),
                supabase
                    .from('appointments')
                    .update({ status: "confirmed", payment_status: "paid" })
                    .eq('id', order_id)
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

            // Fetch data for notifications purpose:
            console.log("[DB][QUERY_START]", {
                requestId,
                table: "appointments",
                action: "select_all",
                order_id
            });

            const { data: appointment, error: fetchError } = await supabaseAdmin
                .from("appointments")
                .select("*")
                .eq('id', order_id)
                .single();

            console.log("[DB][QUERY_RESULT]", {
                requestId,
                data: appointment,
                error: fetchError
            });

            if (fetchError || !appointment) {
                console.error("[DB][ERROR]", {
                    requestId,
                    message: "Appointment Fetch error",
                    error: fetchError
                });
                throw new Error("Could not find appointment data");
            }

            // Fetch the patient data using the patient_id from the appointment
            console.log("[DB][QUERY_START]", {
                requestId,
                table: "patients",
                action: "select",
                patient_id: appointment.patient_id
            });

            const { data: patientData, error: patientError } = await supabaseAdmin
                .from("patients")
                .select("supabase_user_id, email, contact_number, full_name")
                .eq('id', appointment.patient_id)
                .single();

            console.log("[DB][QUERY_RESULT]", {
                requestId,
                data: patientData,
                error: patientError
            });

            if (patientError || !patientData) {
                console.error("[DB][ERROR]", {
                    requestId,
                    message: "Patient Fetch error",
                    error: patientError
                });
                throw new Error("Could not find patient data for notification");
            }

            // Trigger the Notification (Email/SMS/In-App)
            console.log("[NOTIFICATION][START]", {
                requestId,
                userId: patientData.supabase_user_id,
                eventType: "appointment_confirmed"
            });

            await notify({
                userId: patientData.supabase_user_id,
                role: "patient",
                eventType: "appointment_confirmed",
                title: "Appointment Confirmed",
                message: `Your appointment is confirmed on ${new Date(appointment.starts_at).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })}`,
                channels: ["in_app"],
                payload: {
                    appointment_id: appointment.id,
                    practitioner_id: appointment.practitioner_id,
                    starts_at: appointment.starts_at,
                    ends_at: appointment.ends_at,
                    email: patientData.email,
                    recipientName: patientData.full_name,
                    subject: "Your appointment is confirmed",
                    actionUrl: `https://Clinecxa.com/consultation/meeting?room=${appointment.room_key}`,
                    actionText: "Join Meeting",
                    phone: patientData.contact_number,
                },
            });

            if (
                Array.isArray(appointment?.additional_attendees) &&
                appointment.additional_attendees.length > 0
            ) {
                try {
                    await sendAppointmentInvites({
                        appointmentId: appointment.id,
                        practitionerId: appointment.practitioner_id,
                        attendees: appointment.additional_attendees, // now objects
                        meetingStartISO: appointment.starts_at,
                        room_key: appointment.room_key,
                    });
                } catch (attendeeInviteError) {
                    console.error("[NOTIFICATION][ERROR]", {
                        requestId,
                        message: "Attendee invite error",
                        error: attendeeInviteError
                    });
                }
            }

            console.log("[API][RESPONSE]", {
                requestId,
                status: "redirect_success",
                appointment_id
            });

            return NextResponse.redirect(`${baseUrl}/dashboard/appointment/status?appointmentId=${appointment_id}&payment=success`, 303);
        }
        else 
        {
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
    catch (error)
    {
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