import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin"; // supabase Server
import { requireUser } from "@/lib/authGuard";
import { parse } from "path";

export async function POST(request: Request) {
    const { authorized, response, user } = await requireUser();
    // add patiuent_id and cliniko_id in table columns later
    console.log("API Route Reached: /api/payhere");

    try {
        const MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID!;
        const currency = process.env.PAYHERE_CURRENCY || 'LKR';
        const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const NGROK_URL = process.env.NGROK_URL;

        if(!BASE_URL)
        {
            throw new Error("BASE_URL is not defined in environment variables.");
        }

        const body = await request.json();
        console.log("Request Body received :", body);

        // These are paramters that we expect from the booking form
        const {
            first_name, last_name, email, phone, address, city, country, booking_amount
        } = body;

        // if any required field is missing, return error 
        if (!first_name || !last_name || !email || !phone || !address || !city || !country || !booking_amount) {
            return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
        }

        const orderID = `BOOK-${Date.now()}`; // uuid 

        // add two more comuns
        const {data: dbData, error: dbError} = await supabase.from('transactions').insert({
            order_id: orderID,
            status:'PENDING',
            amount: parseFloat(booking_amount).toFixed(2),
            currency: currency,
            customer_email: email,
            customer_name: `${first_name} ${last_name}`,
            customer_phone: phone,
            customer_address: address,
            customer_city: city,
            customer_country: country
        });

        if(dbError){
            console.error("Error inserting transaction into DB:", dbError);
            return NextResponse.json({error: "Failed to initialize payment transaction in DB."}, {status: 500});
        }

        console.log("DB : Created PENDING transaction with Order ID:", orderID);

        // Construct URL to call our hash calculation API
        const hashApiUrl = `${BASE_URL}/api/payhere/calculate-hash?amount=${booking_amount}&order_id=${orderID}`;
        console.log("Hash API URL:", hashApiUrl);

        // Generate hash for PayHere payment
        const hashResponse = await fetch(hashApiUrl, {
            method: 'GET',
        });

        if (!hashResponse.ok) {
            const errData = await hashResponse.json();
            throw new Error(errData.error || 'Failed to get hash from server.');
        }

        // Extract data from hashResponse
        const data: {order_id: string, hash: string; amount: string; currency: string } = await hashResponse.json();

        const itemsDescription = `Booking Payment for your reservation (Ref: ${orderID})`;

        // Final PayHere payment payload (With fields from form and other required fields)
        const payHerePayload = {
            sandbox: true,
            merchant_id: MERCHANT_ID,
            return_url: `${BASE_URL}/success`,
            cancel_url: `${BASE_URL}/failure`,
            notify_url: `${NGROK_URL}/api/payhere/notify`,
            first_name,
            last_name,
            email,
            phone,
            address,
            city,
            country,
            amount: data.amount, 
            currency,
            order_id:data.order_id,
            hash: data.hash,
            items: itemsDescription
        }
        return NextResponse.json({ payment: payHerePayload });
    } catch (err: any) {
        console.log("Error in /api/payhere:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}