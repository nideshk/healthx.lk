import { auditLog } from "@/lib/audit/auditLog";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { requireUser } from "@/lib/authGuard";
import { notify } from "@/lib/notify";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
    req: NextRequest,
    {
        params,
    }: {
        params: Promise<{ id: string }>;
    }
): Promise<Response> {

    const { user, authorized, response } = await requireUser(req);
    if (!authorized) return response;

    const availabilityId = (await params).id;

    if (!availabilityId) {
        return NextResponse.json(
            { error: "Availability ID required" },
            { status: 400 }
        );
    }

    const isPractitioner = user?.role === "practitioner";
    const isAdmin = ["admin", "superadmin"].includes(user?.role || "");

    if (!isPractitioner && !isAdmin) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 403 }
        );
    }

    /* ---------------- FETCH AVAILABILITY ---------------- */

    const { data: existing, error: fetchError } = await supabaseAdmin
        .from("practitioner_availability")
        .select("id, practitioner_id")
        .eq("id", availabilityId)
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

    /* ---------------- OWNERSHIP CHECK ---------------- */

    if (isPractitioner) {
        if (!user?.practitioner_id) {
            return NextResponse.json(
                { error: "Not a practitioner" },
                { status: 403 }
            );
        }

        if (existing.practitioner_id !== user.practitioner_id) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }
    }

    /* ---------------- DELETE ---------------- */

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

    const cnx = getAuditContext(req, user);

    await auditLog({
        ...cnx,
        action: "DELETED",
        entityType: "PRACTITIONER_AVAILABILITY",
        purpose: "operations",
        source: "dashboard",
        metadata: { availability_id: availabilityId },
    })

    const { data: practitoner } = await supabaseAdmin.from("practitioners").select("contact_email").eq("id", existing.practitioner_id).single();

    if (user.role === "admin" || user.role === "superadmin") {
        await notify({
            userId: existing.practitioner_id,
            role: "practitioner",
            eventType: "availability_deleted_by_admin",
            title: "Availability Updated",
            message: `Availability deleted by Admin, please visit Clinecxa Dashboard to update your availability.`,
            channels: ["email", "in_app"],
            payload: {
                email: practitoner?.contact_email,
                added_by_role: user.role,
            },
        });
    }

    return NextResponse.json({
        success: true,
        deleted_id: availabilityId,
    });
}
