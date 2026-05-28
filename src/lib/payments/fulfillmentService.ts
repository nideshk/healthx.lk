import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notify } from "@/lib/notify";
import { sendAppointmentInvites } from '@/lib/additional_attendee/appointmentInvites';

interface FulfillmentParams {
    order_id: string;
    requestId: string;
}

export async function fulfillAppointment({ order_id, requestId }: FulfillmentParams) {
    const supabase = await supabaseAdmin;

    // Check Idempotency
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

    if (currentApp?.status === 'confirmed' && currentApp?.payment_status === 'paid') {
        console.log("[API][RESPONSE]", {
                    requestId,
                    status: "redirect_success_idempotent",
                    order_id
                });
        return { success: true, status: "idempotent" };
    }

    console.log("[DB][QUERY_START]", {
        requestId,
        action: "batch_update_payment_status",
        order_id
    });

    // Perform Batch DB updates
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
        channels: ["in_app", "email", "sms"],
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

    // Additional Attendee Invites
    if (Array.isArray(appointment?.additional_attendees) && appointment.additional_attendees.length > 0) {
        try {
            await sendAppointmentInvites({
                appointmentId: appointment.id,
                practitionerId: appointment.practitioner_id,
                attendees: appointment.additional_attendees,
                meetingStartISO: appointment.starts_at,
                room_key: appointment.room_key,
            });
        } catch (attendeeInviteError) {
            console.error("[NOTIFICATION][ERROR]", {
                requestId,
                message: "Attendee invite error within extracted service module",
                error: attendeeInviteError
            });
        }
    }

    return { success: true, status: "fulfilled" };
}