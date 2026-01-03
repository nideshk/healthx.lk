import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { computeRefund } from "@/lib/refunds/refundRules";

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
      transactions (*)
    `)
    .eq("status", "cancelled")
    .is("refund_requested", false)
    .limit(50);

  if (error) {
    console.error("Refund cron fetch failed:", error);
    return;
  }

  for (const appt of appointments ?? []) {
    const txn = appt.transactions?.[0];
    const decision = computeRefund({
      appointment: appt,
      transaction: txn,
    });

    if (!decision.eligible) continue;

    await supabaseAdmin.from("refunds").insert({
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
    });

    await supabaseAdmin
      .from("appointments")
      .update({ refund_requested: true })
      .eq("id", appt.id);
  }
}
