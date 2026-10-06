import { prisma } from './prisma';

export async function logSecurityEvent({
  action,
  userId,
  targetId,
  ip,
  details
}: {
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'ROLE_CHANGE' | 'PASSWORD_RESET' | 'USER_DELETE' | 'USER_CREATE' | 'SESSION_ISSUANCE' | 'AUTH_BYPASS_ATTEMPT';
  userId?: string | null;
  targetId?: string | null;
  ip?: string | null;
  details?: string | null;
}) {
  try {
    await prisma.securityAuditLog.create({
      data: {
        action,
        userId,
        targetId,
        ip,
        details
      }
    });
  } catch (error) {
    console.error('Failed to write security audit log:', error);
  }
}
