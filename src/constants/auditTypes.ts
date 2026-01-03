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
  | "FAILED"
  | "DENIED"
  | "DELETED"
  | "APPROVED"
  | "CANCELLED"
  | "EXPORTED"
  | "LOGIN"
  | "FAILED_ACCESS";

export type AuditPurpose =
  | "treatment"
  | "payment"
  | "operations"
  | "support"
  | "compliance"


export type EntityType = 
| "PATIENT"
| "PRACTITIONER"
| "APPOINTMENT"
| "PHI_FILE"
| "IDENTIFICATION_FILE"
| "BILLING"
| "USER_ACCOUNT"
| "SYSTEM_EVENT"
| "OTHER"
| "FOLLOW_UP_ENCOUNTERS"
| "ENCOUNTER"
| "HIPAA_AUDIT_LOG"
| "ADMIN_USER"


export type AuditEvent = {
  actorUserId?: string;
  actorRole: ActorRole;
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  purpose?: AuditPurpose;
  source?: "api" | "dashboard" | "cron" | "webhook" | "admin_panel";
  requestId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
};
