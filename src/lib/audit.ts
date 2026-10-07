import { prisma } from './prisma';

// CWE-778: Allowed action types (exhaustive enum — no free-form strings)
export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'SESSION_ISSUANCE'
  | 'SESSION_ROTATION'
  | 'AUTH_BYPASS_ATTEMPT'
  | 'ROLE_CHANGE'
  | 'PASSWORD_RESET'
  | 'USER_CREATE'
  | 'USER_DELETE'
  | 'PERMISSION_DENIED'
  | 'PROCESS_CREATE'
  | 'PROCESS_ARCHIVE'
  | 'PROCESS_APPROVE'
  | 'PROCESS_VERSION';

// CWE-200: Structured, typed metadata — no free-form user-controlled strings
export interface AuditMeta {
  // Only typed system-controlled values permitted:
  authMethod?: 'LOCAL' | 'LDAP';
  newRole?: string;
  targetEmail?: string; // hashed/masked below — never raw user input
  reason?: 'INVALID_CREDENTIALS' | 'LDAP_FAILURE' | 'ACCOUNT_NOT_FOUND' | 'LDAP_ENFORCED' | 'IDENTITY_CONFLICT' | 'MISSING_LOCAL_ACCOUNT' | 'RATE_LIMITED';
}

export interface AuditEvent {
  action: AuditAction;
  userId?: string | null;
  targetId?: string | null;
  ip?: string | null;
  meta?: AuditMeta;
}

// Mask last 3 chars of IPv4 octet for privacy
function maskIp(ip: string | null | undefined): string | null {
  if (!ip || ip === 'unknown_ip') return ip ?? null;
  return ip.replace(/(\.\d+)$/, '.***');
}

// Build a safe, structured summary string — no raw user input
function buildDetails(action: AuditAction, meta?: AuditMeta): string {
  const parts: string[] = [`action=${action}`];
  if (meta?.authMethod) parts.push(`method=${meta.authMethod}`);
  if (meta?.newRole) parts.push(`newRole=${meta.newRole}`);
  if (meta?.reason) parts.push(`reason=${meta.reason}`);
  // targetEmail deliberately omitted — userId/targetId FK is sufficient
  return parts.join(' ');
}

export async function logSecurityEvent(event: AuditEvent) {
  const { action, userId, targetId, ip, meta } = event;
  const maskedIp = maskIp(ip);
  const details = buildDetails(action, meta);

  // Dual-write:
  // 1. Structured JSON → stdout (immutable external stream — SIEM/log aggregator picks this up)
  //    This is outside the application DB and cannot be tampered with by DB-level attackers.
  process.stdout.write(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'SECURITY',
    action,
    userId: userId ?? null,
    targetId: targetId ?? null,
    ip: maskedIp,
    details,
  }) + '\n');

  // 2. Best-effort write to application DB (for in-app admin UI)
  //    This is NOT the authoritative audit trail — stdout/SIEM is.
  try {
    await prisma.securityAuditLog.create({
      data: {
        action,
        userId,
        targetId,
        ip: maskedIp,
        details,
      }
    });
  } catch {
    // Silent — DB failure must not mask the stdout write above
  }
}
