import { computeRefund } from "@/lib/refunds/refundRules";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function runRefundEligibilityCron() {
  const { data: appointments, error } = await supabaseAdmin
    .from("appointments")
    .select(`
      id,
      status,
      cancelled_at,
      starts_at,
      practitioner_no_show,
      patient_no_show,
      refund_requested,
      transactions (*)
    `)
    .eq("status", "cancelled")
    .eq("practitioner_no_show", true)
    .eq("patient_no_show", false)
    .is("refund_requested", false)
    .limit(50);

  if (error) {
    console.error("Refund cron fetch failed:", error);
    return;
  }

  for (const appt of appointments ?? []) {
    const txn = appt.transactions?.[0];
    if (!txn) continue;

    const decision = computeRefund({
      appointment: appt,
      transaction: txn,
    });

    if (!decision.eligible) continue;

    await supabaseAdmin
      .from("refunds")
      .upsert(
        {
          appointment_id: appt.id,
          transaction_id: txn.id,
          patient_id: txn.patient_id,
          practitioner_id: txn.practitioner_id,
          refund_amount: decision.amount,
          currency: txn.currency,
          refund_type: decision.type,
          reason: decision.reason,
          status: "requested",
          requested_by: null,
        },
        { onConflict: "transaction_id" }
      );

    await supabaseAdmin
      .from("appointments")
      .update({ refund_requested: true })
      .eq("id", appt.id)
      .is("refund_requested", false);
  }
}
