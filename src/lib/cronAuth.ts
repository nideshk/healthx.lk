import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

/**
 * Rejects cron requests unless Authorization is exactly
 * `Bearer ${CRON_SECRET}`. Missing secret fails closed.
 * Returns a 401 response, or null when the caller is allowed.
 */
export function unauthorizedCronResponse(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn("[cron] CRON_SECRET is not set; refusing cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provided = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);

  if (
    providedBuf.length !== expectedBuf.length ||
    !timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
