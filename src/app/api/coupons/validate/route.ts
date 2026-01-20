import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { computeDiscount } from "@/lib/coupons/computeDiscount";

export async function POST(req: Request) {
    const body = await req.json();
    const {
        code,
        patient_id,
        practitioner_id,
        pricing
    } = body;

    const { data: coupon } = await supabaseAdmin
        .from("discount_coupons")
        .select("*")
        .eq("code", code)
        .eq("is_active", true)
        .single();

    if (!coupon) {
        return NextResponse.json(
            { valid: false, error: "Invalid coupon" },
            { status: 400 }
        );
    }

    const now = new Date();

    if (
        (coupon.valid_from &&
            new Date(coupon.valid_from) > now) ||
        (coupon.valid_until &&
            new Date(coupon.valid_until) < now)
    ) {
        return NextResponse.json(
            { valid: false, error: "Coupon expired" },
            { status: 400 }
        );
    }

    // Practitioner eligibility
    const { data: mappings } =
        await supabaseAdmin
            .from("coupon_practitioner_map")
            .select("practitioner_id")
            .eq("coupon_id", coupon.id);

    if (

        mappings && mappings?.length > 0 &&
        !mappings?.some(
            m => m.practitioner_id === practitioner_id
        )
    ) {
        return NextResponse.json(
            {
                valid: false,
                error: "Coupon not applicable"
            },
            { status: 400 }
        );
    }

    // Usage limits
    const { count: totalUses } =
        await supabaseAdmin
            .from("coupon_redemptions")
            .select("*", { count: "exact", head: true })
            .eq("coupon_id", coupon.id);

    if (
        totalUses && coupon.max_total_uses &&
        totalUses >= coupon.max_total_uses
    ) {
        return NextResponse.json(
            { valid: false, error: "Usage limit reached" },
            { status: 400 }
        );
    }

    const { count: userUses } =
        await supabaseAdmin
            .from("coupon_redemptions")
            .select("*", { count: "exact", head: true })
            .eq("coupon_id", coupon.id)
            .eq("patient_id", patient_id);

    if (
        userUses && coupon.max_uses_per_user &&
        userUses >= coupon.max_uses_per_user
    ) {
        return NextResponse.json(
            {
                valid: false,
                error: "Coupon already used"
            },
            { status: 400 }
        );
    }

    const discount = computeDiscount({
        coupon,
        pricing
    });

    return NextResponse.json({
        valid: true,
        discount,
        final_payable:
            pricing.consultation_fee +
            pricing.platform_fee -
            discount.discount_total
    });
}
