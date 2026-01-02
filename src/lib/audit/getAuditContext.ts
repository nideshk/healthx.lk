import { NextRequest } from "next/server";

export function getAuditContext(req: NextRequest, user?: any) {
  return {
    actorUserId: user?.id,
    actorRole: user?.role ?? "system",
    ipAddress: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  };
}
