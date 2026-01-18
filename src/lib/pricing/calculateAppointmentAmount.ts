export interface PricingInput {
    baseFee: number;                 // appointmentType.fee (includes platform fee)
    platformFee?: number;            // breakdown only
    selectedAttendeesCount?: number; // includes patient
    extraFeePerAttendee?: number;
}

export interface PricingBreakdown {
    consultationFee: number;
    serviceFee: number;
    tax: number;
    extraAttendeeFee: number;
    total: number;
    platformFee?: number;
}

const SERVICE_FEE_RATE = 0.05;
const TAX_RATE = 0.08;

export function calculateAppointmentAmount(
    input: PricingInput
): PricingBreakdown {
    const {
        baseFee,
        platformFee,
        selectedAttendeesCount = 1,
        extraFeePerAttendee = 0,
    } = input;

    if (!Number.isFinite(baseFee) || baseFee <= 0) {
        throw new Error("Invalid base fee");
    }

    const extraAttendees = Math.max(0, selectedAttendeesCount - 1);
    const extraAttendeeFee = extraAttendees * extraFeePerAttendee;

    const consultationFee = baseFee + extraAttendeeFee + (platformFee || 950);

    const serviceFee = Math.round(consultationFee * SERVICE_FEE_RATE);
    const tax = Math.round((consultationFee + serviceFee) * TAX_RATE);

    const total = consultationFee + serviceFee + tax;

    return {
        consultationFee,
        serviceFee,
        tax,
        extraAttendeeFee,
        total,
        platformFee, // informational only
    };
}
