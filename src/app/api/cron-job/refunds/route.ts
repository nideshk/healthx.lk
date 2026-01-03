import { NextResponse } from "next/server";
import { runRefundEligibilityCron } from "./refundEligibilityCron";

export async function POST(req: Request) {
 
  await runRefundEligibilityCron();
  return NextResponse.json({ success: true });
}
