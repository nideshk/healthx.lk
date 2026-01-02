export type ActorRole =
  | "patient"
  | "practitioner"
  | "admin"
  | "superadmin"
  | "system";

export type AuditAction =
  | "VIEWED"
  | "CREATED"
  | "UPDATED"
  | "DELETED"
  | "CANCELLED"
  | "EXPORTED"
  | "LOGIN"
  | "FAILED_ACCESS";

export type AuditPurpose =
  | "treatment"
  | "payment"
  | "operations"
  | "support";

export type AuditEvent = {
  actorUserId?: string;
  actorRole: ActorRole;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  purpose?: AuditPurpose;
  source?: "api" | "dashboard" | "cron" | "webhook";
  requestId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
};
