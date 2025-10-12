// This route will help in notifying us about payment status from PayHere and we can get the required fields that we want to store in our DB

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

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
        merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig 
    } = paymentData;
    
    // --- Step 1: Re-validate Hash (Security Gate) ---
    const innerHash = getMd5Hash(MERCHANT_SECRET);
    const hashString = merchant_id + order_id + payhere_amount + payhere_currency + status_code + innerHash;
    const calculatedMd5Sig = getMd5Hash(hashString);

    if (calculatedMd5Sig !== md5sig) {
        console.error(`IPN FAILED: Hash mismatch for Order ID ${order_id}`);
        return new NextResponse("Hash Verification Failed.", { status: 200 }); 
    }

    // --- Step 2: Process Status and Update DB ---
    if (status_code === '2') {
        // For now only logging success, but here we would update our DB to mark the order as paid
        console.log(`SUCCESS: Booking ${order_id} CONFIRMED. Amount: ${payhere_amount} ${payhere_currency}`);
    } else {
        console.log(`TRANSACTION FAILED: ${status_code} for Order ${order_id}.`);
    }

    // Always respond with 200 OK
    return new NextResponse(null, { status: 200 });
}