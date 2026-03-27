import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from 'crypto';
import { notify } from "@/lib/notify";
import { sendAppointmentInvites } from '@/lib/additional_attendee/appointmentInvites';

export async function POST(request: NextRequest) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    let appointment_id = "";

    try 
    {
        const formData = await request.formData();
        const status_code = formData.get('status_code');
        const order_id = formData.get('order_id');
        appointment_id = (formData.get('custom_fields') as string) || "";
        const signature = formData.get('signature') as string;
        const paymentBase64 = formData.get('payment') as string;
        
        const rawPaymentData = Buffer.from(paymentBase64, 'base64').toString('utf8');
        const publicKey = process.env.WEBXPAY_PUBLIC_KEY;
        const cleanPublicKey = publicKey?.split('\n').map(line => line.trim()).filter(line => line).join('\n');

        let decryptedSignature = "";
        try
        {
            decryptedSignature = crypto.publicDecrypt(
                {
                    key: cleanPublicKey!,
                    padding: crypto.constants.RSA_PKCS1_PADDING,
                },
                Buffer.from(signature, 'base64')
            ).toString('utf8').replace(/\0/g, '');
        } 
        catch (decryptionError)
        {
            console.error("Signature Decryption Failed:", decryptionError);
            return NextResponse.json({ error: "Verification failed" }, { status: 403 });
        }

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
                    console.log("Attendee invites failed:", attendeeInviteError);
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