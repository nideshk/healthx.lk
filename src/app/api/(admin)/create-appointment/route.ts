import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";
import { notify } from "@/lib/notify";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Convert local date + time in practitioner's timezone → UTC Date
 * date: YYYY-MM-DD
 * time: HH:mm
 */
function toUtcFromLocal(
    date: string,
    time: string,
    timeZone: string
): Date {
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);

    // Guess UTC first
    const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));

    // Convert using timezone offset
    const tzDate = new Date(
        utcGuess.toLocaleString("en-US", { timeZone })
    );

    const offsetMs = utcGuess.getTime() - tzDate.getTime();
    return new Date(utcGuess.getTime() + offsetMs);
}

/* -------------------------------------------------------------------------- */
/* API                                                                        */
/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
    try {
        /* ---------------- AUTH ---------------- */

        const { authorized, user } = await requireUser(req);
        const cnx = getAuditContext(req, user);

        if (!authorized || !user) {
            await auditLog({
                ...cnx,
                action: "FAILED",
                entityType: "APPOINTMENT",
                purpose: "operations",
                source: "dashboard",
                metadata: {
                    reason: "Unauthorized appointment creation attempt"
                }
            });
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = user.profile?.role;
        if (!["admin", "superadmin"].includes(role)) {
            await auditLog({
                ...cnx,
                action: "FAILED",
                entityType: "APPOINTMENT",
                purpose: "operations",
                source: "dashboard",
                metadata: {
                    reason: "Access denied - insufficient role",
                    role
                }
            });
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        /* ---------------- INPUT ---------------- */

        const body = await req.json();
        const {
            practitioner_id,
            patient_id,
            appointment_type_id,
            date,        // YYYY-MM-DD
            start_time, // HH:mm
            pre_consultation_data,
        } = body;

        if (
            !practitioner_id ||
            !patient_id ||
            !appointment_type_id ||
            !date ||
            !start_time
        ) {
            await auditLog({
                ...cnx,
                action: "FAILED",
                entityType: "APPOINTMENT",
                purpose: "operations",
                source: "dashboard",
                metadata: {
                    reason: "Missing required fields",
                    provided: {
                        practitioner_id: !!practitioner_id,
                        patient_id: !!patient_id,
                        appointment_type_id: !!appointment_type_id,
                        date: !!date,
                        start_time: !!start_time
                    }
                }
            });
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        /* ---------------- APPOINTMENT TYPE ---------------- */

        const { data: appointmentType, error: typeErr } =
            await supabaseAdmin
                .from("appointment_type")
                .select("id, duration_mins, base_fee, platform_fee")
                .eq("id", appointment_type_id)
                .single();

        if (typeErr || !appointmentType) {
            await auditLog({
                ...cnx,
                action: "FAILED",
                entityType: "APPOINTMENT",
                purpose: "operations",
                source: "dashboard",
                metadata: {
                    reason: "Invalid appointment type",
                    appointment_type_id
                }
            });
            return NextResponse.json(
                { error: "Invalid appointment type" },
                { status: 400 }
            );
        }

        /* ---------------- PRACTITIONER (FEES + TIMEZONE) ---------------- */

        const { data: practitioner, error: practitionerErr } =
            await supabaseAdmin
                .from("practitioners")
                .select("fees")
                .eq("id", practitioner_id)
                .single();

        if (practitionerErr || !practitioner) {
            await auditLog({
                ...cnx,
                action: "FAILED",
                entityType: "APPOINTMENT",
                purpose: "operations",
                source: "dashboard",
                metadata: {
                    reason: "Invalid practitioner",
                    practitioner_id
                }
            });

            return NextResponse.json(
                { error: "Invalid practitioner" },
                { status: 400 }
            );
        }

        const { data: availability } = await supabaseAdmin
            .from("practitioner_availability")
            .select("timezone")
            .eq("practitioner_id", practitioner_id)
            .single();

        const timezone = availability?.timezone || "Asia/Kolkata";

        /* ---------------- TIME CALCULATION ---------------- */

        const startsAt = toUtcFromLocal(date, start_time, timezone);
        const endsAt = new Date(
            startsAt.getTime() + appointmentType.duration_mins * 60 * 1000
        );

        /* ---------------- EXPIRY CALCULATION ---------------- */
        /**
         * expires_at = min(
         *   now + 2 days,
         *   starts_at - 15 minutes
         * )
         */

        const now = new Date();

        const twoDaysFromNow = new Date(
            now.getTime() + 2 * 24 * 60 * 60 * 1000
        );

        const beforeAppointment = new Date(
            startsAt.getTime() - 15 * 60 * 1000
        );

        let expiresAt = twoDaysFromNow;

        if (beforeAppointment > now && beforeAppointment < expiresAt) {
            expiresAt = beforeAppointment;
        }

        /* ---------------- PRICING (NO TAX) ---------------- */

        const practitionerFees = practitioner.fees || {};
        const practitionerFeeEntry = practitionerFees[appointment_type_id];

        const consultationFee =
            Number(practitionerFeeEntry?.fee) ||
            Number(appointmentType.base_fee) ||
            0;

        const platformFee = Number(appointmentType.platform_fee || 0);
        const taxAmount = 0; // ❌ No tax (explicit)

        const totalFee =
            consultationFee +
            platformFee +
            taxAmount;

        /* ---------------- CONFLICT CHECK ---------------- */

        const { data: conflicts, error: conflictErr } =
            await supabaseAdmin
                .from("appointments")
                .select("id")
                .eq("practitioner_id", practitioner_id)
                .lt("starts_at", endsAt.toISOString())
                .gt("ends_at", startsAt.toISOString())
                .in("status", ["pending", "scheduled", "confirmed", "payment_cancelled"])
                .order("created_at", { ascending: false })

        if (conflictErr) {
            await auditLog({
                ...cnx,
                action: "FAILED",
                entityType: "APPOINTMENT",
                purpose: "operations",
                source: "dashboard",
                metadata: {
                    reason: "Conflict validation failed"
                }
            });

            console.error(conflictErr);
            return NextResponse.json(
                { error: "Failed to validate availability" },
                { status: 500 }
            );
        }

        if (conflicts && conflicts.length > 0) {
            await auditLog({
                ...cnx,
                action: "FAILED",
                entityType: "APPOINTMENT",
                purpose: "operations",
                source: "dashboard",
                metadata: {
                    reason: "Time slot conflict",
                    practitioner_id,
                    starts_at: startsAt.toISOString()
                }
            });

            return NextResponse.json(
                { error: "Selected time slot is already booked" },
                { status: 409 }
            );
        }

        /* ---------------- INSERT ---------------- */

        const { data: appointment, error: insertErr } =
            await supabaseAdmin
                .from("appointments")
                .insert({
                    practitioner_id,
                    patient_id,
                    appointment_type_id,

                    starts_at: startsAt.toISOString(),
                    ends_at: endsAt.toISOString(),
                    expires_at: expiresAt.toISOString(),

                    status: "pending",
                    payment_status: "pending",

                    // 💰 Pricing
                    consultation_fee: consultationFee,
                    platform_fee: platformFee,
                    tax_amount: taxAmount,
                    fee_charged: totalFee,
                    currency: "LKR",
                    pricing_version: "v1",

                    created_by_admin_id: user.admin?.id,
                    source: "admin",
                })
                .select()
                .single();

        if (insertErr) {
            console.error(insertErr);
            await auditLog({
                ...cnx,
                action: "FAILED",
                entityType: "APPOINTMENT",
                purpose: "operations",
                source: "dashboard",
                metadata: {
                    reason: "Appointment insert failed"
                }
            });
            return NextResponse.json(
                { error: "Failed to create appointment" },
                { status: 500 }
            );
        }

        await auditLog({
            ...cnx,
            action: "CREATED",
            entityType: "APPOINTMENT",
            entityId: appointment.id,
            purpose: "operations",
            source: "dashboard",
            metadata: {
                practitioner_id,
                appointment_type_id,
                starts_at: startsAt.toISOString(),
                expires_at: expiresAt.toISOString(),
                total_fee: totalFee,
                currency: "LKR"
            }
        });

        /* ---------------- PRE-CONSULTATION DATA ---------------- */

        if (pre_consultation_data) {
            await supabaseAdmin.from("preconsult_responses").insert({
                appointment_id: appointment.id,
                raw_payload: pre_consultation_data,
                patient_id: patient_id,
            });
        }

        /* ---------------- FETCH DETAILS FOR NOTIFICATION ---------------- */

        const { data: patient } = await supabaseAdmin
            .from("patients")
            .select("id, full_name, email")
            .eq("id", patient_id)
            .single();

        const { data: practitionerProfile } = await supabaseAdmin
            .from("practitioners")
            .select("id, full_name, contact_email")
            .eq("id", practitioner_id)
            .single();

        const readableDate = startsAt.toLocaleDateString("en-LK", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            timeZone: "Asia/Colombo",
        });

        const readableTime = startsAt.toLocaleTimeString("en-LK", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Colombo",
        });

        /* ---------------- NOTIFY PATIENT ---------------- */

        try {
            if (patient?.email) {
                await notify({
                    userId: patient.id,
                    role: "patient",
                    eventType: "appointment_created",
                    title: "Appointment Created Successfully",
                    message: `
        Hello ${patient.full_name},

        Your appointment has been successfully created.

        Doctor: ${practitionerProfile?.full_name || "Your Practitioner"}
        Date: ${readableDate}
        Time: ${readableTime}

        Total Fee: LKR ${totalFee}

        Please complete the payment before expiry.

        Regards,
        Clinecxa Team
            `.trim(),
                    channels: ["email"],
                    payload: {
                        email: patient.email,
                        appointment_id: appointment.id,
                    },
                });
            }
        } catch (err) {
            console.error("Patient notification failed:", err);
        }

        return NextResponse.json({
            success: true,
            appointment,
        });
    } catch (err: any) {
        console.error("POST /api/create-appointment", err);
        return NextResponse.json(
            { error: err?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
