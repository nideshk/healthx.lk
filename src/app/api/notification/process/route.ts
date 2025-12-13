import { processNotifications } from "@/workers/notificationWorker";
import { NextResponse } from "next/server";

export async function POST() {
  await processNotifications();
  return NextResponse.json({ success: true });
}
