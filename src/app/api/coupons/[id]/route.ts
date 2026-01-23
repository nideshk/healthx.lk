import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";

export async function PATCH(
    req: Request,
    {
        params,
    }: {
        params: Promise<{ id: string }>;
    }
): Promise<Response> {
    const { id } = await params;
    const { user } = await requireUser(req);
    const body = await req.json();

    if (!["admin", "practitioner"].includes(user?.role || "")) {
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
        return NextResponse.json(
            { error: "Coupon not found" },
            { status: 404 }
        );
    }

    // Practitioner restrictions
    if (user?.role === "practitioner") {
        if (coupon.created_by_id !== user.practitioner_id) {
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
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }

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
        return NextResponse.json(
            { error: error.message },
            { status: 400 }
        );
    }

    return NextResponse.json(data);
}
