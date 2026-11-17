import { processNotifications } from "@/workers/notificationWorker";
import { unauthorizedCronResponse } from "@/lib/cronAuth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const denied = unauthorizedCronResponse(req);
  if (denied) return denied;

  await processNotifications();
  return NextResponse.json({ success: true });
}
