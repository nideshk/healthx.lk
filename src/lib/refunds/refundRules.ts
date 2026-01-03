export function computeRefund({
  appointment,
  transaction,
}: {
  appointment: any;
  transaction: any;
}) {
  if (!transaction || transaction.status !== "success") {
    return { eligible: false };
  }

  if (transaction.refund_status !== "none") {
    return { eligible: false };
  }

  if (appointment.patient_no_show) {
    return { eligible: false };
  }

  if (appointment.practitioner_no_show) {
    return {
      eligible: true,
      type: "full",
      amount: transaction.amount,
      reason: "Practitioner no-show",
    };
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
      reason: "Cancelled before 24 hours",
    };
  }

  if (diffHours >= 2) {
    return {
      eligible: true,
      type: "partial",
      amount: Math.round(transaction.amount * 0.5),
      reason: "Late cancellation (50%)",
    };
  }

  return { eligible: false };
}
