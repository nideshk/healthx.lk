// This route will help in notifying us about payment status from PayHere and we can get the required fields that we want to store in our DB

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { notify } from '@/lib/notify';
import { sendAppointmentInvites } from '@/lib/additional_attendee/appointmentInvites';

const MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET!;

const getMd5Hash = (input: string): string => {
    return crypto.createHash('md5').update(input).digest('hex').toUpperCase();
};

export async function POST(request: NextRequest) {
    // PayHere sends application/x-www-form-urlencoded, handled by request.formData()
    const formData = await request.formData();
    // Convert FormData to a standard object for easy access
    const paymentData: { [key: string]: string } = Object.fromEntries(formData.entries()) as { [key: string]: string };

    console.log("--- IPN RECEIVED ---", paymentData);

    const {
        merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig, payment_id
    } = paymentData;

    // Step1 : Re-validate hash
    const innerHash = getMd5Hash(MERCHANT_SECRET);
    const hashString = merchant_id + order_id + payhere_amount + payhere_currency + status_code + innerHash;
    const calculatedMd5Sig = getMd5Hash(hashString);

    if (calculatedMd5Sig !== md5sig) {
        console.error(`IPN FAILED: Hash mismatch for Order ID ${order_id}`);
        return NextResponse.json({ message: "Hash mismatch" }, { status: 400 });
    }

    // Updating step to handle update transaction, update appointment record and send notifications once the payment is verified from payhere side
    if (status_code === '2') {
        try {
            const { data: updatedTransaction, error: transactionError } = await supabaseAdmin
                .from('transactions')
                .update({
                    status: 'paid',
                    payment_id: payment_id || null,
                    status_code: 2,
                    payhere_data: paymentData,
                    updated_at: new Date().toISOString()
                })
                .eq('order_id', order_id)
                .neq('status', 'paid')
                .select();

            // Case where transaction was already PAID so return from here ealry
            if (!updatedTransaction || updatedTransaction.length === 0) {
                console.log(`Transaction ${order_id} already marked as PAID. Skipping.`);
                return NextResponse.json({ message: "Transaction already marked as PAID" }, { status: 200 });
            }

            // Check if Appointment is already confirmed (Idempotency)
            const { data: currentApp } = await supabaseAdmin
                .from('appointments')
                .select('status, payment_status')
                .eq('id', order_id)
                .single();

            if (currentApp?.status === 'confirmed' && currentApp?.payment_status == 'paid') {
                console.log(`Appointment ${order_id} already confirmed. Skipping notify.`);
                return NextResponse.json({ message: "Appointment already confirmed" }, { status: 200 });
            }

            // Update booking and payment status for appointment
            const { error: updateError } = await supabaseAdmin
                .from("appointments")
                .update({
                    status: "confirmed",
                    payment_status: "paid"
                })
                .eq("id", order_id);

            if (updateError) {
                console.error("Error updating appointment statuses", updateError);
                throw new Error("Failed to update appointment record");
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

            console.log("\n-------------Data fetched for notification purpose related to appointment-------------\n", appointment);

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

            console.log("\n-------------Data fetched for notification purpose related to patient-------------\n", patientData);

            // Trigger the Notification (Email/SMS/In-App)
            await notify({
                userId: patientData.supabase_user_id,
                role: "patient",
                eventType: "appointment_confirmed",
                title: "Appointment Confirmed",
                message: `Your appointment is confirmed on ${new Date(appointment.starts_at).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })}`,
                channels: ["in_app", "email", "sms"], // Added sms as well, but can be disabled during testing to avoid costs.
                payload: {
                    appointment_id: appointment.id,
                    practitioner_id: appointment.practitioner_id,
                    starts_at: appointment.starts_at,
                    ends_at: appointment.ends_at,
                    email: patientData.email,
                    recipientName: patientData.full_name,
                    subject: "Your appointment is confirmed",
                    actionUrl: `https://Clinecxa-rho.vercel.app/consultation/meeting?room=${appointment.room_key}`,
                    actionText: "Join Meeting",
                    phone: patientData.contact_number,
                },
            });

            if (Array.isArray(appointment?.additional_attendees) && appointment.additional_attendees?.length > 0) {
                try {
                    await sendAppointmentInvites({
                        appointmentId: appointment.id,
                        practitionerId: appointment?.practitioner_id,
                        attendees: appointment?.additional_attendees,
                        meetingStartISO: appointment?.starts_at,
                        room_key: appointment.room_key
                    });
                } catch (attendeeInviteError) {
                    console.log("Attendee invites failed : ", attendeeInviteError);
                }
            }

            console.log(`✅ Webhook Processed: Appointment ${order_id} confirmed and user notified.`);

        } catch (error) {
            console.error("🚨 Critical Webhook Error:", error);
        }
    }
    else if (status_code === '0') {
        // This means payment is pending so don't mark it as failed, just log it.
        console.log(`Order ${order_id} is pending bank approval`);
    }
    else {
        // This handles cancelled, failed.
        console.warn(`Payment not successful. Status Code: ${status_code} for Order: ${order_id}`);

        try {
            // Update the transaction record
            await supabaseAdmin
                .from('transactions')
                .update({
                    status: 'failed',
                    status_code: parseInt(status_code, 10),
                    payhere_data: paymentData
                })
                .eq('order_id', order_id)
                .neq('status', 'paid');

        } catch (error) {
            console.error("Error updating failed payment status:", error);
        }
    }

    // Always respond with 200 OK
    return NextResponse.json({ message: "Webhook processed successfully" }, { status: 200 });
}