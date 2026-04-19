export type ActorRole =
  | "patient"
  | "practitioner"
  | "admin"
  | "superadmin"
  | "system";

export type AuditAction =
  | "VIEWED"
  | "READ"
  | "SYSTEM_CANCELLED"
  | "CREATED"
  | "UPDATED"
  | "CHECKED_STATUS"
  | "UNAUTHORIZED_ATTEMPT"
  | "FAILED"
  | "UNAUTHORIZED_ATTACHMENT_META_ATTEMPT"
  | "DENIED"
  | "FORBIDDEN_ACCESS_ATTEMPT"
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
  | "analytics"
  | "support"
  | "compliance"


export type EntityType =
  | "PRACTITIONER_AVAILABILITY"
  | "PATIENT"
  | "PENDING_REVIEW"
  | "COUPON"
  | "USER"
  | "PROFILE"
  | "ATTACHMENT"
  | "APPOINTMENT_REVIEW"
  | "APPOINTMENT_DRAFT"
  | "FOLLOW_UP_DATA"
  | "PRACTITIONER"
  | "APPOINTMENT_DETAILS"
  | "APPOINTMENT_TYPE"
  | "CONSULTATION_DATA"
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
  | "TRANSACTION";


export type AuditEvent = {
  actorUserId?: string;
  actorRole: ActorRole;
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  purpose?: AuditPurpose;
  source?: "api" | "dashboard" | "cron" | "webhook" | "admin_panel" | "user_portal";
  requestId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
};
