import { computeRefund } from "@/lib/refunds/refundRules";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function runRefundEligibilityCron() {
  console.log("[RefundCron] 🚀 Started refund eligibility cron");

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
    console.error("[RefundCron] ❌ Fetch failed", error);
    return;
  }

  console.log(
    `[RefundCron] 📦 Fetched ${appointments?.length ?? 0} candidate appointment(s)`
  );

  for (const appt of appointments ?? []) {
    console.log(
      `[RefundCron] 🔍 Processing appointment`,
      {
        appointment_id: appt.id,
        practitioner_no_show: appt.practitioner_no_show,
        patient_no_show: appt.patient_no_show,
        refund_requested: appt.refund_requested,
      }
    );

    const txn = appt.transactions?.[0];

    if (!txn) {
      console.warn(
        `[RefundCron] ⚠️ No transaction found — skipping`,
        { appointment_id: appt.id }
      );
      continue;
    }

    
    console.log(
      `[RefundCron] 💳 Transaction found`,
      {
        transaction_id: txn.id,
        amount: txn.amount,
        currency: txn.currency,
        status: txn.status,
      }
    );

    const decision : any = computeRefund({
      appointment: appt,
      transaction: txn,
    });

    console.log(
      `[RefundCron] 🧮 Refund decision`,
      {
        appointment_id: appt.id,
        eligible: decision.eligible,
        reason: decision.reason,
        amount: decision.amount,
        type: decision.type,
      }
    );

    if (!decision.eligible) {
      console.log(
        `[RefundCron] ⛔ Not eligible — skipping`,
        { appointment_id: appt.id }
      );
      continue;
    }

    console.log(
      `[RefundCron] ✅ Eligible — creating refund request`,
      {
        appointment_id: appt.id,
        transaction_id: txn.id,
        refund_amount: decision.amount,
      }
    );

    const { error: refundError } = await supabaseAdmin
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

    if (refundError) {
      console.error(
        `[RefundCron] ❌ Refund upsert failed`,
        { appointment_id: appt.id, error: refundError }
      );
      continue;
    }

    const { error: updateError } = await supabaseAdmin
      .from("appointments")
      .update({ refund_requested: true })
      .eq("id", appt.id)
      .is("refund_requested", false);

    if (updateError) {
      console.error(
        `[RefundCron] ❌ Failed to mark refund_requested`,
        { appointment_id: appt.id, error: updateError }
      );
      continue;
    }

    console.log(
      `[RefundCron] 🏁 Refund flow completed`,
      { appointment_id: appt.id }
    );
  }

  console.log("[RefundCron] 🎉 Cron execution finished");
}
