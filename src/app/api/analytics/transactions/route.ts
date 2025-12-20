import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";

export const dynamic = "force-dynamic"; // Ensures dynamic execution (no caching)

// Endpoint: /api/analytics/transactions
export async function GET(req: Request) {

    const { authorized, response, user } = await requireUser();
    if (!authorized) {
        return response;
    }

    // Check if the user has the 'admin' role
    if (user?.profile?.role !== 'admin') {
        return NextResponse.json(
            { message: 'Access denied.' },
            { status: 403 }
        );
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const status = searchParams.get('status')?.toLowerCase();

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    // Check if the status is valid
    if (status) {
        const allowedStatuses = ['refund', 'complete', 'pending'];
        if (!allowedStatuses.includes(status)) {
            return NextResponse.json(
                { message: `Invalid status filter value: ${status}. Must be one of: refund, complete, pending.` },
                { status: 400 }
            );
        }
    }

    try {
        // Create base query
        let query = supabaseClient.from("transactions").select("*", { count: 'exact' });

        const dateColumn = 'created_at';

        if (from) {
            // Filter transactions ON or AFTER the start of the 'from' date
            query = query.gte(dateColumn, `${from}T00:00:00Z`);
        }
        if (to) {
            // Filter transactions ON or BEFORE the end of the 'to' date
            query = query.lte(dateColumn, `${to}T23:59:59Z`);
        }

        if (status) {
            query = query.eq('status', status);
        }

        query = query.order(dateColumn, { ascending: false }).range(start, end);

        // Execute query
        const { data: transactions, error, count: totalCount } = await query;

        if (error) {
            console.error('Database Error:', error);
            return NextResponse.json(
                { message: 'Failed to fetch filtered transactions.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: "Filtered transactions fetched successfully.",
            page,
            pageSize,
            totalCount: totalCount || 0,
            count: transactions?.length || 0,
            data: transactions || []
        });

    } catch (error) {
        console.error('API Handler Error:', error);
        return NextResponse.json(
            { message: 'An internal server error occurred.' },
            { status: 500 }
        );
    }
}