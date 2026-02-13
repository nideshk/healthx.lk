import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

export async function PATCH(
    req: NextRequest,
    {
        params,
    }: {
        params: Promise<{ id: string }>;
    }
): Promise<Response> {
    const { id } = await params;
    const { user } = await requireUser(req);
    const body = await req.json();
    const cnx = getAuditContext(req, user);
    if (!user || !["admin", "practitioner"].includes(user?.role || "")) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 403 }
        );
    }

    // Fetch coupon first (ownership + scope validation)
    const { data: coupon, error: fetchError } =
        await supabaseAdmin
            .from("discount_coupons")
            .select("*")
            .eq("id", id)
            .single();

    if (fetchError || !coupon) {
        await auditLog({
            ...cnx,
            action: "FAILED",
            source: "dashboard",
            entityType: "USER",
            entityId: user?.auth_user_id,
            metadata: {
                "user_id": user?.auth_user_id,
            },
            purpose: "operations",
        })
        return NextResponse.json(
            { error: "Coupon not found" },
            { status: 404 }
        );
    }

    // Practitioner restrictions
    if (user?.role === "practitioner") {
        if (coupon.created_by_id !== user.practitioner_id) {
            await auditLog({
                ...cnx,
                action: "FAILED",
                source: "dashboard",
                entityType: "USER",
                entityId: user?.auth_user_id,
                metadata: {
                    "user_id": user?.auth_user_id,
                },
                purpose: "operations",
            })
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        // Practitioners can ONLY toggle active status
        const allowedPatch = {
            is_active: body.is_active
        };

        const { data, error } =
            await supabaseAdmin
                .from("discount_coupons")
                .update(allowedPatch)
                .eq("id", id)
                .select()
                .single();

        if (error) {
            await auditLog({
                ...cnx,
                action: "FAILED",
                source: "dashboard",
                entityType: "USER",
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
            action: "UPDATED",
            source: "dashboard",
            entityType: "USER",
            entityId: user?.auth_user_id,
            metadata: {
                "user_id": user?.auth_user_id,
            },
            purpose: "operations",
        })
        return NextResponse.json(data);
    }

    // -------------------------
    // Admin update
    // -------------------------

    const adminAllowedFields = [
        "is_active",
        "description",
        "valid_from",
        "valid_until",
        "max_total_uses",
        "max_uses_per_user"
    ];

    // Optional: allow economic edits only if no redemptions exist
    const { count: redemptionCount } =
        await supabaseAdmin
            .from("coupon_redemptions")
            .select("*", { count: "exact", head: true })
            .eq("coupon_id", id);

    if (redemptionCount === 0) {
        adminAllowedFields.push(
            "discount_type",
            "discount_value",
            "applies_scope",
            "platform_bear_percentage"
        );
    }

    const updatePayload: Record<string, any> = {};

    for (const key of adminAllowedFields) {
        if (key in body) {
            updatePayload[key] = body[key];
        }
    }

    if (Object.keys(updatePayload).length === 0) {
        await auditLog({
            ...cnx,
            action: "FAILED",
            source: "dashboard",
            entityType: "USER",
            entityId: user?.auth_user_id,
            metadata: {
                "user_id": user?.auth_user_id,
            },
            purpose: "operations",
        })
        return NextResponse.json(
            { error: "No valid fields to update" },
            { status: 400 }
        );
    }

    const { data, error } =
        await supabaseAdmin
            .from("discount_coupons")
            .update(updatePayload)
            .eq("id", id)
            .select()
            .single();

    if (error) {
        await auditLog({
            ...cnx,
            action: "FAILED",
            source: "dashboard",
            entityType: "USER",
            entityId: user?.auth_user_id,
            metadata: {
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
        action: "UPDATED",
        source: "dashboard",
        entityType: "USER",
        entityId: user?.auth_user_id,
        metadata: {
            data: data,
            "user_id": user?.auth_user_id,
        },
        purpose: "operations",
    })

    return NextResponse.json(data);
}
