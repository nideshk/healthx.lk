type RefundDecision =
  | { eligible: false }
  | {
      eligible: true;
      type: "full" | "partial";
      amount: number;
      reason: string;
    };

export function computeRefund({
  appointment,
  transaction,
}: {
  appointment: any;
  transaction: any;
}): RefundDecision {
  // --------------------
  // Guard rails
  // --------------------
  if (!transaction || transaction.status !== "success") {
    return { eligible: false };
  }

  if (transaction.refund_status !== "none") {
    return { eligible: false };
  }

  // --------------------
  // 1️⃣ Practitioner NO-SHOW
  // --------------------
  if (
    appointment.practitioner_no_show === true &&
    appointment.patient_no_show === false
  ) {
    return {
      eligible: true,
      type: "full",
      amount: transaction.amount,
      reason: "PRACTITIONER_NO_SHOW",
    };
  }

  // --------------------
  // 2️⃣ Practitioner CANCELLED
  // --------------------
  if (appointment.cancelled_by === "practitioner") {
    return {
      eligible: true,
      type: "full",
      amount: transaction.amount,
      reason: "PRACTITIONER_CANCELLED",
    };
  }

  // --------------------
  // 3️⃣ Patient CANCELLED (time-based)
  // --------------------
  if (appointment.cancelled_by === "patient") {
    if (!appointment.cancelled_at || !appointment.starts_at) {
      return { eligible: false };
    }

    const cancelledAt = new Date(appointment.cancelled_at);
    const startsAt = new Date(appointment.starts_at);

    const diffHours =
      (startsAt.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);

    if (diffHours >= 24) {
      return {
        eligible: true,
        type: "full",
        amount: transaction.amount,
        reason: "PATIENT_CANCELLED_24H",
      };
    }

    if (diffHours >= 2) {
      return {
        eligible: true,
        type: "partial",
        amount: Math.floor(transaction.amount * 0.5),
        reason: "PATIENT_CANCELLED_LATE_50",
      };
    }
  }

  // --------------------
  // No refund
  // --------------------
  return { eligible: false };
}
