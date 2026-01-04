import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

export const dynamic = "force-dynamic"; // Ensures dynamic execution (no caching)

// Endpoint: /api/analytics/transactions
export async function GET(req: NextRequest) {

    const { authorized, response, user } = await requireUser();
    if (!authorized) {
        return response;
    }

    const cnx = getAuditContext(req, user);
    // Check if the user has the 'admin' role or 'superadmin' role
    if (user?.profile?.role !== 'admin' && user?.profile?.role !== 'superadmin') {
        await auditLog({
            ...cnx,
            action: "FORBIDDEN_ACCESS_ATTEMPT",
            entityType: "TRANSACTION",
            purpose: "analytics",
            metadata: {
                description: `Non-admin ${user?.auth_user_id} attempted to access transactions analytics.`,
            }
        })
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

    // Validate status
    const allowedStatuses = ['refund', 'paid', 'failed'];
    if (status && !allowedStatuses.includes(status)) {
        return NextResponse.json(
            { message: "Invalid status filter" },
            { status: 400 }
        );
    }

    // Validate date helper
    const isValidDate = (dateStr: string | null) => {
        if (!dateStr) return true;

        // Check if it's a real date and matches YYYY-MM-DD
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateStr)) return false;
        const d = new Date(dateStr);
        return d instanceof Date && !isNaN(d.getTime());
    };

    // Validate dates
    if (!isValidDate(from) || !isValidDate(to)) {
        return NextResponse.json({ message: "Invalid date format. Please use YYYY-MM-DD." }, { status: 400 });
    }

    try {
        // query to send analytics data
        const dateColumn = 'created_at';
        const requiredFields = "amount, appointment_id, consultation_fee, created_at, currency, customer_email, customer_name, customer_phone, id, order_id, payment_id, platform_fee, practitioner_id, status";


        let analyticsQuery = supabaseClient
            .from("transactions")
            .select("amount, platform_fee, consultation_fee, status")
            .eq("status", "paid");

        // Create base query
        let query = supabaseClient.from("transactions").select(requiredFields, { count: 'exact' });

        if (from) {
            analyticsQuery = analyticsQuery.gte(dateColumn, `${from}T00:00:00Z`);
            query = query.gte(dateColumn, `${from}T00:00:00Z`);
        }

        if (to) {
            analyticsQuery = analyticsQuery.lte(dateColumn, `${to}T23:59:59Z`);
            query = query.lte(dateColumn, `${to}T23:59:59Z`);
        }

        if (status) {
            query = query.eq('status', status);
        }

        query = query.order(dateColumn, { ascending: false }).range(start, end);

        const [analyticsResult, listResult] = await Promise.all([
            analyticsQuery,
            query
        ]);

        if (analyticsResult.error) throw analyticsResult.error;
        if (listResult.error) throw listResult.error;

        const analytics = (analyticsResult.data || []).reduce((acc, curr) => {
            const gross = Number(curr?.amount || 0);
            const platformFee = Number(curr?.platform_fee || 0);
            const consultationFee = Number(curr?.consultation_fee || 0);
            const serviceFee = Math.round(consultationFee * 0.05);
            const tax = Math.round((consultationFee + serviceFee) * 0.08);

            return {
                totalGrossAmount: acc.totalGrossAmount + gross,
                totalPlatformFees: acc.totalPlatformFees + platformFee,
                totalConsultationFees: acc.totalConsultationFees + consultationFee,
                totalServiceFees: acc.totalServiceFees + serviceFee,
                totalTaxes: acc.totalTaxes + tax,
                netAmount: acc.netAmount + platformFee,
                totalCompletedTransactions: acc.totalCompletedTransactions + 1
            };
        }, {
            totalGrossAmount: 0,
            totalPlatformFees: 0,
            totalConsultationFees: 0,
            totalServiceFees: 0,
            totalTaxes: 0,
            netAmount: 0,
            totalCompletedTransactions: 0
        });

        await auditLog({
            ...cnx,
            action: "VIEWED",
            entityType: "TRANSACTION",
            purpose: "analytics",
            source: "dashboard",
            metadata: {
                filters: { from, to, status, page, pageSize },
                analytics_summary: analytics
            }
        })

        return NextResponse.json({
            message: "Transactions fetched successfully.",
            analytics,
            pagination: {
                totalRecords: listResult.count || 0,
                currentPage: page,
                pageSize: pageSize,
                totalPages: Math.ceil((listResult.count || 0) / pageSize)
            },
            data: listResult.data || []
        });

    } catch (error) {
        console.error('API Handler Error:', error);
        return NextResponse.json(
            { message: 'An internal server error occurred.' },
            { status: 500 }
        );
    }
}