import { NextResponse } from "next/server";
import { createServerSupabaseClient as supabase } from "@/lib/supabaseServer"; // supabase Server
import { requireUser } from "@/lib/authGuard";
import crypto from 'crypto';

export async function POST(request: Request) {
    const { authorized, response, user } = await requireUser();

    if (!authorized) {
        console.log("Not authorized access to /api/payhere");
        return response;
    }

    if (!user) {
        console.log("No user found in /api/payhere");
        return NextResponse.json({ error: "User not authenticated." }, { status: 401 });
    }

    let patient_id = null;
    console.log(user);
    

    if (user) {
        patient_id = user.patient_id;
    }

    console.log("*******User patient_id:", patient_id);

    if (!patient_id) {
        console.log("User missing patient_id");
        return NextResponse.json({ error: "User profile incomplete for payment processing." }, { status: 400 });
    }

    console.log("API Route Reached: /api/payhere");

    try {
        const MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID!;
        const MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET!;
        const currency = process.env.PAYHERE_CURRENCY || 'LKR';
        const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const NGROK_URL = process.env.NGROK_URL;
        const PAYHERE_RETURN_PATH = process.env.PAYHERE_RETURN_PATH;
        const PAYHERE_CANCEL_PATH = process.env.PAYHERE_CANCEL_PATH;
        const PAYHERE_NOTIFY_PATH = process.env.PAYHERE_NOTIFY_PATH;

        console.log("BASE URL:", BASE_URL);
        console.log("NGROK URL:", NGROK_URL);
        console.log("PAYHERE RETURN PATH:", PAYHERE_RETURN_PATH);
        console.log("PAYHERE CANCEL PATH:", PAYHERE_CANCEL_PATH);
        console.log("PAYHERE NOTIFY PATH:", PAYHERE_NOTIFY_PATH);

        if (!BASE_URL) {
            throw new Error("BASE_URL is not defined in environment variables.");
        }

        const body = await request.json();
        console.log("Request Body received :", body);

        // These are paramters that we expect from the booking form
        const {
            first_name, last_name, email, phone, address, city, country, booking_amount, appointment_id, practitioner_id, consultation_fee, platform_fee
        } = body;

        // if any required field is missing, return error 
        if (!first_name || !last_name || !email || !phone || !address || !city || !country || !booking_amount || !appointment_id || !practitioner_id) {
            return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
        }

        const orderID = appointment_id;
        const formattedAmount = parseFloat(booking_amount).toFixed(2);

        const supabaseServer = await supabase();
        const { data: dbData, error: dbError } = await supabaseServer.from('transactions').insert({
            order_id: orderID,
            status: 'pending',
            amount: formattedAmount,
            currency: currency,
            customer_email: email,
            customer_name: `${first_name} ${last_name}`,
            customer_phone: phone,
            customer_address: address,
            customer_city: city,
            customer_country: country,
            patient_id: patient_id,
            appointment_id: appointment_id,
            practitioner_id: practitioner_id,
            consultation_fee: parseFloat(consultation_fee).toFixed(2),
            platform_fee: parseFloat(platform_fee).toFixed(2)
        });

        if (dbError) {
            console.error("Error inserting transaction into DB:", dbError);
            return NextResponse.json({ error: "Failed to initialize payment transaction in DB." }, { status: 500 });
        }

        console.log("DB : Created PENDING transaction with Order ID:", orderID);

        // Creating hash directly here instead of calculate-hash route 
        const hash = crypto
            .createHash('md5')
            .update(
                MERCHANT_ID +
                orderID +
                formattedAmount +
                currency +
                crypto.createHash('md5').update(MERCHANT_SECRET).digest('hex').toUpperCase()
            )
            .digest('hex')
            .toUpperCase();

        const itemsDescription = `Medical Consultation (Ref: ${orderID})`;

        const publicDomain = NGROK_URL || BASE_URL;
        const notifyUrl = `${publicDomain}${PAYHERE_NOTIFY_PATH}`;

        console.log("Notify URL : ", notifyUrl);
        

        // Final PayHere payment payload (With fields from form and other required fields)
        const payHerePayload = {
            sandbox: process.env.NODE_ENV !== 'production',
            merchant_id: MERCHANT_ID,
            return_url: `${BASE_URL}${PAYHERE_RETURN_PATH}`,
            cancel_url: `${BASE_URL}${PAYHERE_CANCEL_PATH}`,
            notify_url: notifyUrl,
            first_name,
            last_name,
            email,
            phone,
            address,
            city,
            country,
            amount:formattedAmount,
            currency,
            order_id:orderID,
            hash: hash,
            items: itemsDescription
        }
        return NextResponse.json({ payment: payHerePayload });
    } catch (err: any) {
        console.log("Error in /api/payhere:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}