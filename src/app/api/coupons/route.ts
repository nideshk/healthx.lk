import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";

export async function POST(req: Request) {
    const { user } = await requireUser(req);
    const body = await req.json();
    if (!["admin", "practitioner"].includes(user?.role || "admin")) {
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
            return NextResponse.json(
                { error: "Practitioners can only create practitioner-funded coupons" },
                { status: 400 }
            );
        }

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
        console.log({ error: error.message })
        return NextResponse.json(
            { error: error.message },
            { status: 400 }
        );
    }

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

export async function GET(req: Request) {
    const { user } = await requireUser(req);

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
        return NextResponse.json(
            { error: error.message },
            { status: 400 }
        );
    }

    return NextResponse.json(data);
}
