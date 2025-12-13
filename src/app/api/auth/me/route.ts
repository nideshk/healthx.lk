import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";

export async function GET() {
  const { authorized, user, response , role } = await requireUser();

  if (!authorized) return response;

  return NextResponse.json({
    success: true,
    user,
    role
  });
}
