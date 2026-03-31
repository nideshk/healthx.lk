import { sendSupportEmail } from "@/lib/email";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { email, phone, concern } = await req.json();

        await sendSupportEmail({
            to: "noreply@clinecxa.lk",
            subject: "New Contact Us Message",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #007bff;">New Contact Us Message</h2>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone}</p>
                    <p><strong>Concern:</strong></p>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 10px;">
                        ${concern.replace(/\n/g, '<br>')}
                    </div>
                </div>
            `,
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { success: false },
            { status: 500 }
        );
    }
}