export function computeDiscount({
    coupon,
    pricing
}: {
    coupon: any;
    pricing: {
        consultation_fee: number;
        platform_fee: number;
    };
}) {
    const base =
        pricing.consultation_fee + pricing.platform_fee;

    let discount =
        coupon.discount_type === "percentage"
            ? (base * coupon.discount_value) / 100
            : coupon.discount_value;

    if (coupon.max_discount_amount) {
        discount = Math.min(discount, coupon.max_discount_amount);
    }

    let platform_discount = 0;
    let practitioner_discount = 0;

    if (coupon.applies_scope === "platform") {
        platform_discount = discount;
    } else if (coupon.applies_scope === "practitioner") {
        practitioner_discount = discount;
    } else {
        platform_discount =
            (discount * coupon.platform_bear_percentage) / 100;
        practitioner_discount = discount - platform_discount;
    }

    return {
        discount_total: discount,
        platform_discount,
        practitioner_discount
    };
}
