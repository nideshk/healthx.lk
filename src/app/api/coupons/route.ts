import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

export async function POST(req: NextRequest) {
    const { user } = await requireUser(req);
    const body = await req.json();
    const cnx = getAuditContext(req, user);
    if (!["admin", "practitioner"].includes(user?.role || "admin")) {
        await auditLog({
            ...cnx,
            action: "FAILED",
            source: "dashboard",
            entityType: "COUPON",
            entityId: user?.auth_user_id,
            metadata: {
                error: "Unauthorized",
                "user_id": user?.auth_user_id,
            },
            purpose: "operations",
        })
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 403 }
        );
    }
    if (user?.role === "practitioner") {
        if (
            body.applies_scope &&
            body.applies_scope !== "practitioner"
        ) {
            await auditLog({
                ...cnx,
                action: "FAILED",
                source: "dashboard",
                entityType: "COUPON",
                entityId: user?.auth_user_id,
                metadata: {
                    error: "Practitioners can only create practitioner-funded coupons",
                    "user_id": user?.auth_user_id,
                },
                purpose: "operations",
            })
            return NextResponse.json(
                { error: "Practitioners can only create practitioner-funded coupons" },
                { status: 400 }
            );
        }
        await auditLog({
            ...cnx,
            action: "APPROVED",
            source: "dashboard",
            entityType: "COUPON",
            entityId: user?.auth_user_id,
            metadata: {
                "user_id": user?.auth_user_id,
            },
            purpose: "operations",
        })
        body.applies_scope = "practitioner";
    }

    const { data: coupon, error } =
        await supabaseAdmin
            .from("discount_coupons")
            .insert({
                ...body,
                created_by_role: user?.role,
                created_by_id:
                    user?.role === "practitioner"
                        ? user?.practitioner_id
                        : user?.auth_user_id
            })
            .select()
            .single();

    if (error) {
        await auditLog({
            ...cnx,
            action: "FAILED",
            source: "dashboard",
            entityType: "COUPON",
            entityId: user?.auth_user_id,
            metadata: {
                error: error.message,
                "user_id": user?.auth_user_id,
            },
            purpose: "operations",
        })
        return NextResponse.json(
            { error: error.message },
            { status: 400 }
        );
    }

    await auditLog({
        ...cnx,
        action: "APPROVED",
        source: "dashboard",
        entityType: "COUPON",
        entityId: user?.auth_user_id,
        metadata: {
            "user_id": user?.auth_user_id,
        },
        purpose: "operations",
    })
    // Auto-map practitioner coupons
    if (user?.role === "practitioner") {
        await supabaseAdmin
            .from("coupon_practitioner_map")
            .insert({
                coupon_id: coupon.id,
                practitioner_id: user.practitioner_id
            });
    }

    return NextResponse.json(coupon);
}

export async function GET(req: NextRequest) {
    const { user } = await requireUser(req);
    const cnx = getAuditContext(req, user);
    let query = supabaseAdmin
        .from("discount_coupons")
        .select("*");

    if (user?.role === "practitioner") {
        query = query.eq(
            "created_by_id",
            user?.practitioner_id
        );
    }

    const { data, error } = await query;

    if (error) {
        await auditLog({
            ...cnx,
            action: "FAILED",
            source: "dashboard",
            entityType: "COUPON",
            entityId: user?.auth_user_id,
            metadata: {
                error: error.message,
                "user_id": user?.auth_user_id,
            },
            purpose: "operations",
        })
        return NextResponse.json(
            { error: error.message },
            { status: 400 }
        );
    }

    await auditLog({
        ...cnx,
        action: "APPROVED",
        source: "dashboard",
        entityType: "COUPON",
        entityId: user?.auth_user_id,
        metadata: {
            "user_id": user?.auth_user_id,
        },
        purpose: "operations",
    })
    return NextResponse.json(data);
}
