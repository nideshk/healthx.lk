import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";

export async function GET(req: NextRequest) {
  const { authorized, user } = await requireUser(req);

  if (!authorized) return NextResponse.json({
    success: false,
    message: "Unauthorized"
  });

  return NextResponse.json({
    success: true,
    user
  });
}
