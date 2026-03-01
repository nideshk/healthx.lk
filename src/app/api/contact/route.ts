import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { email, phone, concern } = await req.json();

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: "anirudh.kulkarni.dev@gmail.com",
            subject: "New Contact Us Message",
            text: `
Email: ${email}
Phone: ${phone}

Concern:
${concern}
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