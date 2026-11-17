import { NextResponse } from "next/server";
import { runRefundEligibilityCron } from "./refundEligibilityCron";
import { unauthorizedCronResponse } from "@/lib/cronAuth";

export async function GET(req: Request) {
  const denied = unauthorizedCronResponse(req);
  if (denied) return denied;

  await runRefundEligibilityCron();
  return NextResponse.json({ success: true });
}
