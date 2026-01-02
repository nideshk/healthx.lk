import { AuditEvent } from "@/constants/auditTypes";
import { supabaseAdmin } from "../supabaseAdmin";

/**
 * HIPAA Audit Logger
 * - Non-blocking
 * - Append-only
 * - Never throws
 */

export async function auditLog(event: AuditEvent) {
  try {
    await supabaseAdmin.from("hipaa_audit_log").insert({
      actor_user_id: event.actorUserId ?? null,
      actor_role: event.actorRole,
      action: event.action,
      entity_type: event.entityType,
      entity_id: event.entityId ?? null,
      purpose: event.purpose ?? null,
      source: event.source ?? "api",
      request_id: event.requestId ?? null,
      metadata: event.metadata ?? {},
      ip_address: event.ipAddress ?? null,
      user_agent: event.userAgent ?? null,
    });
  } catch (err) {
    // 🚨 NEVER crash the API because of audit logging
    console.error("AUDIT_LOG_FAILED", err);
  }
}
