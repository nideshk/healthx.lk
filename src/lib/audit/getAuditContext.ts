import { NextRequest } from "next/server";

export function getAuditContext(req: NextRequest, user?: any) {
  return {
    actorUserId: user?.admin?.id || user?.auth_user_id || user?.practitioner_id || user?.patient_id || "",
    actorRole: user?.role ?? "system",
    ipAddress: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  };
}
