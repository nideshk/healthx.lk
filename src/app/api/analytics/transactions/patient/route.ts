import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";

export const dynamic = "force-dynamic"; // Ensures dynamic execution (no caching)

// Endpoint: /api/analytics/transactions/patient
export async function GET(req: Request) {
    const { authorized, response, user } = await requireUser();

    console.log("User: ", user);
    console.log("Authorized: ", authorized);


    if (!authorized) return response;

    // Check if the user has the 'patient' role
    if (user?.profile?.role !== 'patient') {
        return NextResponse.json(
            { message: 'Access denied.' },
            { status: 403 }
        );
    }

    const patientId = user?.patient_id;

    if (!patientId) {
        return NextResponse.json({ error: "Patient ID not found for the user" }, { status: 403 });
    }

    console.log(`🔍 Fetching transactions for patient ID: ${patientId} (User: ${user?.auth_user_id}, Role: ${user?.role})`);

    try {
        // Fetch all transactions for the patient using their patient ID
        const { data: transactions, error } = await supabaseClient
            .from("transactions")
            .select("*")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error('Database Error:', error);
            return NextResponse.json(
                { message: 'Failed to fetch patient transactions.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: "Patient transactions fetched successfully.",
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

