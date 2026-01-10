import { NextResponse } from "next/server";
import { runRefundEligibilityCron } from "./refundEligibilityCron";

export async function GET(req: Request) {
 
  await runRefundEligibilityCron();
  return NextResponse.json({ success: true });
}
