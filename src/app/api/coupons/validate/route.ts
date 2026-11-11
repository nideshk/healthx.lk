import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { computeDiscount } from "@/lib/coupons/computeDiscount";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";
import { requireUser } from "@/lib/authGuard";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { tooManyRequestsMessage } from "@/lib/i18n/tooManyRequestsMessage";

const COUPON_LIMIT = 10;
const COUPON_WINDOW_MS = 60_000;

function invalidCoupon(status = 400) {
    return NextResponse.json(
        { valid: false, error: "Invalid coupon" },
        { status, headers: { "Cache-Control": "no-store" } }
    );
}

export async function POST(req: NextRequest) {
    const limit = rateLimit(
        `coupon:${clientIp(req)}`,
        COUPON_LIMIT,
        COUPON_WINDOW_MS
    );
    if (!limit.ok) {
        return NextResponse.json(
            {
                valid: false,
                error: await tooManyRequestsMessage(),
            },
            {
                status: 429,
                headers: {
                    "Retry-After": String(limit.retryAfterSeconds),
                    "Cache-Control": "no-store",
                },
            }
        );
    }

    const { authorized, user, response } = await requireUser(req);
    if (!authorized || !user) return response;

    let body: {
        code?: string;
        practitioner_id?: string;
        pricing?: { consultation_fee?: number; platform_fee?: number };
    };
    try {
        body = await req.json();
    } catch {
        return invalidCoupon();
    }

    const { code, practitioner_id, pricing } = body;
    const patient_id = user.patient_id;

    if (!code || !patient_id || !pricing) {
        return invalidCoupon();
    }

    const cnx = getAuditContext(req, user);
    const { data: coupon } = await supabaseAdmin
        .from("discount_coupons")
        .select(
            "id, discount_type, discount_value, applies_scope, platform_bear_percentage, max_discount_amount, valid_from, valid_until, max_total_uses, max_uses_per_user, is_active"
        )
        .eq("code", code)
        .eq("is_active", true)
        .single();

    if (!coupon) {
        await auditLog({
            ...cnx,
            action: "FAILED",
            source: "dashboard",
            entityType: "COUPON",
            entityId: user.auth_user_id,
            metadata: {
                user_id: user.auth_user_id,
            },
            purpose: "operations",
        });
        return invalidCoupon();
    }

    const now = new Date();

    if (
        (coupon.valid_from && new Date(coupon.valid_from) > now) ||
        (coupon.valid_until && new Date(coupon.valid_until) < now)
    ) {
        await auditLog({
            ...cnx,
            action: "FAILED",
            source: "dashboard",
            entityType: "COUPON",
            entityId: user.auth_user_id,
            metadata: {
                error: "Coupon expired",
                user_id: user.auth_user_id,
            },
            purpose: "operations",
        });
        return invalidCoupon();
    }

    const { data: mappings } = await supabaseAdmin
        .from("coupon_practitioner_map")
        .select("practitioner_id")
        .eq("coupon_id", coupon.id);

    if (
        mappings &&
        mappings.length > 0 &&
        !mappings.some((m) => m.practitioner_id === practitioner_id)
    ) {
        await auditLog({
            ...cnx,
            action: "FAILED",
            source: "dashboard",
            entityType: "COUPON",
            entityId: user.auth_user_id,
            metadata: {
                error: "Coupon not applicable",
                user_id: user.auth_user_id,
            },
            purpose: "operations",
        });
        return invalidCoupon();
    }

    const { count: totalUses } = await supabaseAdmin
        .from("coupon_redemptions")
        .select("*", { count: "exact", head: true })
        .eq("coupon_id", coupon.id);

    if (
        totalUses &&
        coupon.max_total_uses &&
        totalUses >= coupon.max_total_uses
    ) {
        await auditLog({
            ...cnx,
            action: "FAILED",
            source: "dashboard",
            entityType: "COUPON",
            entityId: user.auth_user_id,
            metadata: {
                error: "Usage limit reached",
                user_id: user.auth_user_id,
            },
            purpose: "operations",
        });
        return invalidCoupon();
    }

    const { count: userUses } = await supabaseAdmin
        .from("coupon_redemptions")
        .select("*", { count: "exact", head: true })
        .eq("coupon_id", coupon.id)
        .eq("patient_id", patient_id);

    if (
        userUses &&
        coupon.max_uses_per_user &&
        userUses >= coupon.max_uses_per_user
    ) {
        await auditLog({
            ...cnx,
            action: "FAILED",
            source: "dashboard",
            entityType: "COUPON",
            entityId: user.auth_user_id,
            metadata: {
                error: "Coupon already used",
                user_id: user.auth_user_id,
            },
            purpose: "operations",
        });
        return invalidCoupon();
    }

    const consultationFee = Number(pricing.consultation_fee);
    const platformFee = Number(pricing.platform_fee);
    if (!Number.isFinite(consultationFee) || !Number.isFinite(platformFee)) {
        return invalidCoupon();
    }

    const discount = computeDiscount({
        coupon,
        pricing: {
            consultation_fee: consultationFee,
            platform_fee: platformFee,
        },
    });

    await auditLog({
        ...cnx,
        action: "APPROVED",
        source: "dashboard",
        entityType: "COUPON",
        entityId: user.auth_user_id,
        metadata: {
            user_id: user.auth_user_id,
        },
        purpose: "operations",
    });

    return NextResponse.json(
        {
            valid: true,
            discount: {
                discount_total: discount.discount_total,
            },
        },
        { headers: { "Cache-Control": "no-store" } }
    );
}
