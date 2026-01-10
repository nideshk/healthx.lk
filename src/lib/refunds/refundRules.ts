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
  const ctx = {
    appointment_id: appointment?.id,
    transaction_id: transaction?.id,
  };

  console.log("[RefundRules] 🔍 Evaluating refund", ctx);

  // --------------------
  // Guard rails
  // --------------------
  if (!transaction) {
    console.log("[RefundRules] ⛔ No transaction", ctx);
    return { eligible: false };
  }

  if (transaction.status !== "success") {
    console.log("[RefundRules] ⛔ Transaction not successful", {
      ...ctx,
      status: transaction.status,
    });
    return { eligible: false };
  }

  // --------------------
  // 1️⃣ Practitioner NO-SHOW
  // --------------------
  if (
    appointment.practitioner_no_show === true &&
    appointment.patient_no_show === false
  ) {
    console.log("[RefundRules] ✅ Practitioner no-show → FULL refund", {
      ...ctx,
      amount: transaction.amount,
    });

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
    console.log("[RefundRules] ✅ Practitioner cancelled → FULL refund", {
      ...ctx,
      amount: transaction.amount,
    });

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
      console.log(
        "[RefundRules] ⛔ Missing cancelled_at or starts_at",
        ctx
      );
      return { eligible: false };
    }

    const cancelledAt = new Date(appointment.cancelled_at);
    const startsAt = new Date(appointment.starts_at);

    const diffHours =
      (startsAt.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);

    console.log("[RefundRules] ⏱ Patient cancellation timing", {
      ...ctx,
      diffHours,
    });

    if (diffHours >= 24) {
      console.log(
        "[RefundRules] ✅ Patient cancelled ≥24h → FULL refund",
        ctx
      );

      return {
        eligible: true,
        type: "full",
        amount: transaction.amount,
        reason: "PATIENT_CANCELLED_24H",
      };
    }

    if (diffHours >= 2) {
      console.log(
        "[RefundRules] ✅ Patient cancelled ≥2h → PARTIAL refund (50%)",
        {
          ...ctx,
          amount: Math.floor(transaction.amount * 0.5),
        }
      );

      return {
        eligible: true,
        type: "partial",
        amount: Math.floor(transaction.amount * 0.5),
        reason: "PATIENT_CANCELLED_LATE_50",
      };
    }

    console.log(
      "[RefundRules] ⛔ Patient cancelled too late (<2h)",
      ctx
    );
  }

  // --------------------
  // No refund
  // --------------------
  console.log("[RefundRules] ❌ No refund applicable", ctx);
  return { eligible: false };
}
