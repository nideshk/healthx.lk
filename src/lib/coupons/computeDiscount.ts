type PricingInput = {
    consultation_fee: number;
    platform_fee: number;
};

export function computeDiscount({
    coupon,
    pricing
}: {
    coupon: {
        discount_type: "percentage" | "flat";
        discount_value: number;
        applies_scope: "platform" | "practitioner" | "both";
        platform_bear_percentage?: number | null;
        max_discount_amount?: number | null;
    };
    pricing: PricingInput;
}) {
    const baseAmount =
        pricing.consultation_fee + pricing.platform_fee;

    let discountTotal =
        coupon.discount_type === "percentage"
            ? (baseAmount * coupon.discount_value) / 100
            : coupon.discount_value;

    if (coupon.max_discount_amount) {
        discountTotal = Math.min(
            discountTotal,
            coupon.max_discount_amount
        );
    }

    let platform_discount = 0;
    let practitioner_discount = 0;

    if (coupon.applies_scope === "platform") {
        platform_discount = discountTotal;
    } else if (coupon.applies_scope === "practitioner") {
        practitioner_discount = discountTotal;
    } else {
        const platformShare =
            coupon.platform_bear_percentage ?? 0;

        platform_discount =
            (discountTotal * platformShare) / 100;

        practitioner_discount =
            discountTotal - platform_discount;
    }

    return {
        discount_total: Number(discountTotal.toFixed(2)),
        platform_discount: Number(platform_discount.toFixed(2)),
        practitioner_discount: Number(practitioner_discount.toFixed(2))
    };
}
