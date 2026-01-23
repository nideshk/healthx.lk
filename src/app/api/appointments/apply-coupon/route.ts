import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { computeDiscount } from "@/lib/coupons/computeDiscount";

export async function POST(req: Request) {
    const body = await req.json();
    const {
        coupon_code,
        appointment,
        transaction
    } = body;

    const { data: coupon } =
        await supabaseAdmin
            .from("discount_coupons")
            .select("*")
            .eq("code", coupon_code)
            .single();

    if (!coupon) {
        return NextResponse.json(
            { error: "Invalid coupon" },
            { status: 400 }
        );
    }

    const discount = computeDiscount({
        coupon,
        pricing: {
            consultation_fee:
                appointment.consultation_fee,
            platform_fee: appointment.platform_fee
        }
    });

    const client =
        supabaseAdmin.rpc("begin_transaction");

    try {
        // Create appointment
        const { data: appt } =
            await supabaseAdmin
                .from("appointments")
                .insert({
                    ...appointment,
                    coupon_id: coupon.id,
                    discount_amount:
                        discount.discount_total
                })
                .select()
                .single();

        // Create transaction
        const { data: txn } =
            await supabaseAdmin
                .from("transactions")
                .insert({
                    ...transaction,
                    appointment_id: appt.id,
                    coupon_discount:
                        discount.discount_total
                })
                .select()
                .single();

        // Redemption
        await supabaseAdmin
            .from("coupon_redemptions")
            .insert({
                coupon_id: coupon.id,
                appointment_id: appt.id,
                patient_id: appointment.patient_id,
                discount_total:
                    discount.discount_total,
                platform_discount:
                    discount.platform_discount,
                practitioner_discount:
                    discount.practitioner_discount
            });

        return NextResponse.json({
            success: true,
            appointment_id: appt.id,
            transaction_id: txn.id
        });
    } catch (e: any) {
        return NextResponse.json(
            { error: e.message },
            { status: 500 }
        );
    }
}
