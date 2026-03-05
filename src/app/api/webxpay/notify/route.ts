import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { notify } from '@/lib/notify';
import { sendAppointmentInvites } from '@/lib/additional_attendee/appointmentInvites';

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDMSizE2F37IEZBKuvrLbRBvFZ+
mXNLUaJffFULGafAjDQNf08HvyoAPmVrLa2DRDawWu7jx8w8M/cQgQXlVJhtS68E
fFtirXIyW8XCgo18G1e6cMsc3ePtKuPntOe1oKikUV2sWnqk25BLLCFpKpZaLvrH
oBqI0TMoxwrVRVvvXQIDAQAB
-----END PUBLIC KEY-----`;

export async function POST(request: NextRequest) {
    let paymentData: any = {};
    try {
        const formData = await request.formData();
        paymentData = Object.fromEntries(formData.entries());
    } catch (e) {
        // Fallback to JSON if form data fails
        try {
            paymentData = await request.json();
        } catch (je) {
            return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
        }
    }

    const { payment, custom_fields } = paymentData;

    if (!payment) {
        console.error("WebXPay IPN FAILED: Missing payment parameter");
        return NextResponse.json({ message: "Missing payment parameter" }, { status: 400 });
    }

    try {
        const buffer = Buffer.from(payment, 'base64');
        const decrypted = crypto.publicDecrypt(
            {
                key: PUBLIC_KEY,
                padding: crypto.constants.RSA_PKCS1_PADDING,
            },
            buffer
        );

        const decryptedString = decrypted.toString();
        // WebXPay format: amount|order_id|status (Based on common integration)
        // Let's check for both order_id and custom_fields
        const parts = decryptedString.split('|');
        // Typical WebXPay response: Status_Code|Order_ID|Amount
        const status_code = parts[0];
        const order_id = parts[1] || custom_fields;

        if (status_code === 'success' || status_code === '1') {
            const { data: updatedTransaction, error: transactionError } = await supabaseAdmin
                .from('transactions')
                .update({
                    status: 'paid',
                    status_code: 1,
                    payhere_data: { ...paymentData, decrypted: decryptedString },
                    updated_at: new Date().toISOString()
                })
                .eq('order_id', order_id)
                .neq('status', 'paid')
                .select();

            if (!updatedTransaction || updatedTransaction.length === 0) {
                return NextResponse.json({ message: "Transaction already marked as PAID" }, { status: 200 });
            }

            const { data: currentApp } = await supabaseAdmin
                .from('appointments')
                .select('status, payment_status, patient_id, starts_at, ends_at, room_key, practitioner_id, additional_attendees')
                .eq('id', order_id)
                .single();

            if (currentApp?.status === 'confirmed' && currentApp?.payment_status == 'paid') {
                return NextResponse.json({ message: "Appointment already confirmed" }, { status: 200 });
            }

            await supabaseAdmin
                .from("appointments")
                .update({
                    status: "confirmed",
                    payment_status: "paid"
                })
                .eq("id", order_id);

            const { data: patientData } = await supabaseAdmin
                .from("patients")
                .select("supabase_user_id, email, contact_number, full_name")
                .eq('id', currentApp?.patient_id)
                .single();

            if (patientData) {
                await notify({
                    userId: patientData.supabase_user_id,
                    role: "patient",
                    eventType: "appointment_confirmed",
                    title: "Appointment Confirmed",
                    message: `Your appointment is confirmed on ${new Date(currentApp!.starts_at).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })}`,
                    channels: ["in_app", "email", "sms"],
                    payload: {
                        appointment_id: order_id,
                        practitioner_id: currentApp!.practitioner_id,
                        starts_at: currentApp!.starts_at,
                        ends_at: currentApp!.ends_at,
                        email: patientData.email,
                        recipientName: patientData.full_name,
                        subject: "Your appointment is confirmed",
                        actionUrl: `https://Clinecxa.com/consultation/meeting?room=${currentApp!.room_key}`,
                        actionText: "Join Meeting",
                        phone: patientData.contact_number,
                    },
                });

                if (Array.isArray(currentApp?.additional_attendees) && currentApp.additional_attendees.length > 0) {
                    try {
                        await sendAppointmentInvites({
                            appointmentId: order_id,
                            practitionerId: currentApp!.practitioner_id,
                            attendees: currentApp!.additional_attendees,
                            meetingStartISO: currentApp!.starts_at,
                            room_key: currentApp!.room_key,
                        });
                    } catch (e) {
                        console.log("Attendee invites failed:", e);
                    }
                }
            }
        } else {
            // Mark as failed
            await supabaseAdmin
                .from('transactions')
                .update({
                    status: 'failed',
                    payhere_data: { ...paymentData, decrypted: decryptedString }
                })
                .eq('order_id', order_id)
                .neq('status', 'paid');

            await supabaseAdmin
                .from('appointments')
                .update({
                    status: 'payment_failed',
                    payment_status: 'failed'
                })
                .eq('id', order_id)
                .eq('status', 'pending');
        }

        return NextResponse.json({ message: "Webhook processed successfully" }, { status: 200 });

    } catch (err) {
        console.error("🚨 WebXPay Notification Error:", err);
        return NextResponse.json({ message: "Critical Error" }, { status: 500 });
    }
}
