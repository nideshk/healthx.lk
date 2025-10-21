import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID!;
const MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET!;
const CURRENCY = process.env.PAYHERE_CURRENCY || 'LKR'; 

const getMd5Hash = (input: string): string => {
    return crypto.createHash('md5').update(input).digest('hex').toUpperCase();
};

export async function GET(request: NextRequest) {
    try {
        let amount = request.nextUrl.searchParams.get('amount');
        let order_id = request.nextUrl.searchParams.get('order_id');

        if (!amount) {
            return NextResponse.json({ error: "Amount parameter is required." }, { status: 400 });
        }

        if(!order_id) {
            return NextResponse.json({ error: "Order ID parameter is required." }, { status: 400 });
        }
        
        // Step 1: Format Amount (PayHere requires 2 decimal places)
        const amountFormatted = parseFloat(amount).toFixed(2);

        // Step 2: Calculate Inner Hash (MD5 of Merchant Secret)
        const innerHash = getMd5Hash(MERCHANT_SECRET);
        
        // Step 3: Concatenate string for final hash
        const hashString = MERCHANT_ID + order_id + amountFormatted + CURRENCY + innerHash;
        const finalHash = getMd5Hash(hashString);

        return NextResponse.json({
            order_id: order_id,
            hash: finalHash,
            amount: amountFormatted,
            currency: CURRENCY
        });
    } catch (err) {
        console.error("Error generating PayHere hash:", err);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}