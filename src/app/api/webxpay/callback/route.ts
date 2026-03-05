import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const data = Object.fromEntries(formData.entries());

        // WebXPay POSTs data back to this URL.
        // We can extract the order_id (from custom_fields or decrypted payment)
        // Since we already have a notify (IPN) route handling the DB update,
        // we just need to redirect the user to a success or failure page.

        const order_id = data.custom_fields || "";
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        // We can optionally verify the signature here too, but the status page will do a DB check anyway.
        return NextResponse.redirect(`${baseUrl}/dashboard/appointment/status?appointmentId=${order_id}`, 303);
    } catch (error) {
        console.error("Callback Error:", error);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/dashboard/appointment`, 303);
    }
}
