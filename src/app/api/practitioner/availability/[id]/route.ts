import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
    req: NextRequest,
    context: { params: { id: string } }
) {
    const { user, authorized, response } = await requireUser(req);
    if (!authorized) return response;

    if (!user?.practitioner_id) {
        return NextResponse.json(
            { error: "Not a practitioner" },
            { status: 403 }
        );
    }

    const availabilityId = context.params.id;

    if (!availabilityId) {
        return NextResponse.json(
            { error: "Availability ID required" },
            { status: 400 }
        );
    }

    /* ---- Ownership check (IMPORTANT) ---- */
    const { data: existing, error: fetchError } = await supabaseAdmin
        .from("practitioner_availability")
        .select("id")
        .eq("id", availabilityId)
        .eq("practitioner_id", user.practitioner_id)
        .maybeSingle();

    if (fetchError) {
        console.error(fetchError);
        return NextResponse.json(
            { error: "Failed to verify availability" },
            { status: 500 }
        );
    }

    if (!existing) {
        return NextResponse.json(
            { error: "Availability not found" },
            { status: 404 }
        );
    }

    /* ---- Delete ---- */
    const { error: deleteError } = await supabaseAdmin
        .from("practitioner_availability")
        .delete()
        .eq("id", availabilityId);

    if (deleteError) {
        console.error(deleteError);
        return NextResponse.json(
            { error: "Failed to delete availability" },
            { status: 500 }
        );
    }

    return NextResponse.json({
        success: true,
        deleted_id: availabilityId,
    });
}
