import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { unauthorizedCronResponse } from "@/lib/cronAuth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const denied = unauthorizedCronResponse(req);
    if (denied) return denied;

    try {
        const now = new Date().toISOString();

        // ---------------------------
        // 🧹 CLEANUP QUERY
        // ---------------------------
        const { error, count } = await supabaseAdmin
            .from("appointments")
            .update({
                status: "cancelled",
                payment_status: "expired",
                cancelled_at: now,
                updated_at: now,
            })
            .eq("status", "pending")
            .lt("expires_at", now)
            .select("*",);


        if (error) {
            console.error("❌ Cleanup error:", error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            cleaned: count ?? 0,
            timestamp: now,
        });
    } catch (err: any) {
        console.error("❌ Cron cleanup crash:", err);
        return NextResponse.json(
            { error: err.message || "Internal error" },
            { status: 500 }
        );
    }
}
