// This route will help in notifying us about payment status from PayHere and we can get the required fields that we want to store in our DB

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient as supabase } from '@/lib/supabaseServer';

const MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET!;

const getMd5Hash = (input: string): string => {
    return crypto.createHash('md5').update(input).digest('hex').toUpperCase();
};

export async function POST(request: NextRequest) {
    // PayHere sends application/x-www-form-urlencoded, handled by request.formData()
    const formData = await request.formData();
    // Convert FormData to a standard object for easy access
    const paymentData: { [key: string]: string } = Object.fromEntries(formData.entries()) as { [key: string]: string };

    console.log("--- IPN RECEIVED ---", paymentData);

    const {
        merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig, payment_id
    } = paymentData;

    // Step1 : Re-validate hash
    const innerHash = getMd5Hash(MERCHANT_SECRET);
    const hashString = merchant_id + order_id + payhere_amount + payhere_currency + status_code + innerHash;
    const calculatedMd5Sig = getMd5Hash(hashString);

    if (calculatedMd5Sig !== md5sig) {
        console.error(`IPN FAILED: Hash mismatch for Order ID ${order_id}`);
        return new NextResponse(null, { status: 200 });
    }

    // Step2: Determine Status and Prepare Update data
    const newStatus = status_code === '2' ? 'PAID' : 'FAILED';

    const updateData = {
        status: newStatus,
        payment_id: payment_id || null,
        status_code: parseInt(status_code, 10),
        payhere_data: paymentData,
        updated_at: new Date().toISOString()
    };


    // Step-3: Update Supabase transaction record
    try {
        const supabaseServer = await supabase();
        const { data: updateResult, error: updateError } = await supabaseServer
            .from('transactions')
            .update(updateData)
            .eq('order_id', order_id)
            .eq('status', 'PENDING') // Only update if still PENDING
            .select();

        if (updateError) {
            console.error("Supabase update error for order ID", order_id, ":", updateError);
        }
        else if (updateResult.length === 0) {
            console.warn("No PENDING transaction found to update for order ID", order_id);
        }
        else {
            console.log("Supabase transaction updated for order ID", order_id, "to status", newStatus);
        }
    } catch (error) {
        console.log("Critical DB Update Failure:", error);
    }

    // Always respond with 200 OK
    return new NextResponse(null, { status: 200 });
}