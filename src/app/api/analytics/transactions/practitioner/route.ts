import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";

export const dynamic = "force-dynamic"; // Ensures dynamic execution (no caching)

// Endpoint: /api/analytics/transactions/practitioner
export async function GET(req: Request) {
    const { authorized, response, user } = await requireUser();

    console.log("User: ", user);
    console.log("Authorized: ", authorized);

    if (!authorized) return response;

    // Check if the user has the 'practitioner' role
    if (user?.profile?.role !== 'practitioner') {
        return NextResponse.json(
            { message: 'Access denied.' },
            { status: 403 }
        );
    }

    const practitionerId = user?.practitioner_id;

    if (!practitionerId) {
        return NextResponse.json({ error: "Practitioner ID not found for the user" }, { status: 403 });
    }

    console.log(`🔍 Fetching transactions for practioner ID: ${practitionerId} (User: ${user?.auth_user_id}, Role: ${user?.role})`);

    try {
        // Fetch all transactions for the practitioner using their practitioner ID
        const { data: transactions, error } = await supabaseClient
            .from("transactions")
            .select("*")
            .eq("practitioner_id", practitionerId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error('Database Error:', error);
            return NextResponse.json(
                { message: 'Failed to fetch practitioner transactions.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: "Practitioner transactions fetched successfully.",
            count: transactions?.length || 0,
            data: transactions || []
        })

    } catch (error) {
        console.error('API Handler Error:', error);
        return NextResponse.json(
            { message: 'An internal server error occurred.' },
            { status: 500 }
        );
    }
}