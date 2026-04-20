import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from 'crypto';
import { notify } from "@/lib/notify";
import { sendAppointmentInvites } from '@/lib/additional_attendee/appointmentInvites';
import { getCleanUUID } from "@/utils/uuidUtils";

export async function POST(request: NextRequest) {
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

        // Decode the appointment_id if it's in base64 format
        appointment_id = getCleanUUID(appointment_id);

        let signature = getParam('signature') as string;
        let paymentBase64 = getParam('payment') as string;

        if (signature) signature = signature.replace(/ /g, '+');
        if (paymentBase64) paymentBase64 = paymentBase64.replace(/ /g, '+');

        if (!signature || !paymentBase64) {
            console.error("Missing critical payment data from WebXPay callback.");
            console.log("Form Data Keys:", Array.from(formData.keys()));
            return NextResponse.json({ error: "Data missing" }, { status: 400 });
        }
        
        const rawPaymentData = Buffer.from(paymentBase64, 'base64').toString('utf8');
        const publicKey = process.env.WEBXPAY_PUBLIC_KEY;

        console.log("\n*****************************************\n")

        console.log("Form Data : ", formData);

        console.log("\n*****************************************\n")

        if(!publicKey) {
            console.error("Public key not configured in environment variables.");
            return NextResponse.json({ error: "Verification failed" }, { status: 500 });
        }

        let pemKey = publicKey?.replace(/\\n/g, '\n').replace(/"/g, '').trim();

        if (!pemKey.includes('-----BEGIN PUBLIC KEY-----')) {
            console.error("Public key is missing headers. Attempting to fix...");
            pemKey = `-----BEGIN PUBLIC KEY-----\n${pemKey}\n-----END PUBLIC KEY-----`;
        }

        let decryptedSignature = "";

        // Adding debug logs to identify potential formatting issues with the key or signature
        console.log("=== PRE-DECRYPTION DEBUG ===");
        console.log("Signature Length:", signature?.length);
        console.log("Public Key Prefix:", pemKey.substring(0, 30)); 
        console.log("Public Key Suffix:", pemKey.substring(pemKey.length - 30));
        console.log("Public Key Newline Count:", (pemKey.match(/\n/g) || []).length);
        console.log("============================");
        
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
            console.error("Signature Decryption Failed. Key length:", pemKey.length);
            console.error("Error Detail:", decryptionError);
            return NextResponse.json({ error: "Verification failed" }, { status: 403 });
        }

        // Adding these logs to verify if there are hidden formatting issues
        console.log("=== VERIFICATION DEBUG START ===");
        console.log("Status Code:", formData.get('status_code'));
        console.log("Order ID:", order_id);
        console.log("Raw Payment Data:", `|${rawPaymentData}|`);
        console.log("Decrypted Signature:", `|${decryptedSignature}|`);
        console.log("=== VERIFICATION DEBUG END ===");

        if (rawPaymentData.trim() !== decryptedSignature.trim()) {
            console.error("SECURITY ALERT: Signature Mismatch!");
            return NextResponse.json({ error: "Invalid Signature" }, { status: 403 });
        }

        const supabase = await supabaseAdmin;
        
        if (status_code === '0' || status_code === '00') 
        {
            // Check if Appointment is already confirmed (Idempotency)
            const { data: currentApp } = await supabaseAdmin
                .from('appointments')
                .select('status, payment_status')
                .eq('id', order_id)
                .single();

            if (currentApp?.status === 'confirmed' && currentApp?.payment_status == 'paid') {
                return NextResponse.redirect(`${baseUrl}/dashboard/appointment/status?appointmentId=${appointment_id}&payment=success`, 303);
            }

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

            if (txRes.error) {
                console.error("Transaction Update Error:", txRes.error);
                throw new Error("Transaction update failed.");
            }

            if (appRes.error) {
                console.error("Appointment Update Error:", appRes.error);
                throw new Error("Appointment update failed.");
            }

            // Fetch data for notifications purpose:
            
            // Fetch the appointment data
            const { data: appointment, error: fetchError } = await supabaseAdmin
                .from("appointments")
                .select("*")
                .eq('id', order_id)
                .single();

            if (fetchError || !appointment) {
                console.error("Appointment Fetch error : ", fetchError);
                throw new Error("Could not find appointment data");
            }

            // Fetch the patient data using the patient_id from the appointment
            const { data: patientData, error: patientError } = await supabaseAdmin
                .from("patients")
                .select("supabase_user_id, email, contact_number, full_name")
                .eq('id', appointment.patient_id)
                .single();

            if (patientError || !patientData) {
                console.error("Patient Fetch error : ", patientError);
                throw new Error("Could not find patient data for notification");
            }

            // Trigger the Notification (Email/SMS/In-App)
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
                }
            }

            return NextResponse.redirect(`${baseUrl}/dashboard/appointment/status?appointmentId=${appointment_id}&payment=success`, 303);
        }
        else 
        {
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

            if (txRes.error) {
                console.error("Transaction Update Error:", txRes.error);
                throw new Error("Transaction update failed.");
            }

            if (appRes.error) {
                console.error("Appointment Update Error:", appRes.error);
                throw new Error("Appointment update failed.");
            }

            return NextResponse.redirect(`${baseUrl}/dashboard/appointment/status?appointmentId=${appointment_id}&payment=failed`, 303);
        }
    } 
    catch (error)
    {
        console.error("Callback Processing Error:", error);
        const redirectPath = appointment_id ? `/dashboard/appointment/status?appointmentId=${appointment_id}&payment=error` : '/dashboard/appointment';
        return NextResponse.redirect(`${baseUrl}${redirectPath}`, 303);
    }
}