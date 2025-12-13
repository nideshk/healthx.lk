import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";

export async function POST(req: Request) {
  const { email, roomKey } = await req.json();

  if (!email || !roomKey) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const token = crypto.randomBytes(24).toString("hex");

  await supabaseAdmin.from("telehealth_guests").insert({
    email,
    token,
    room_key: roomKey,
  });

  const link = `${process.env.NEXT_PUBLIC_BASE_URL}/appointment/meeting?room=${roomKey}&token=${token}`;

  // TODO: send email
  console.log("Magic link:", link);

  return NextResponse.json({ link, token });
}
