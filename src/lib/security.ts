import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface UserWithRole {
  id: string;
  username: string;
  roleId: string;
  role: {
    id: string;
    name: string;
    priority: number;
    canAccessAdmin?: boolean;
    [key: string]: any;
  };
  lastReauthAt?: Date | null;
  [key: string]: any;
}

/**
 * 1. CSRF Protection for state-changing requests (POST, PUT, PATCH, DELETE).
 * Verifies Origin or Referer header against host or configured APP_URL.
 */
export function validateCsrf(req: NextRequest): { valid: boolean; reason?: string } {
  const method = req.method.toUpperCase();
  // Safe read-only methods do not modify state
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return { valid: true };
  }

  // API-Key authenticated requests (like FiveM or Discord Bot with x-api-key) are machine-to-machine
  if (req.headers.get('x-api-key') || req.headers.get('authorization')?.startsWith('Bearer vga_')) {
    return { valid: true };
  }

  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const host = req.headers.get('host');

  // At least one of origin or referer should be present in browser fetch/forms
  if (!origin && !referer) {
    // If neither is present, check for custom anti-CSRF header
    const hasCustomHeader = req.headers.has('x-requested-with') || req.headers.has('x-csrf-token');
    if (hasCustomHeader) {
      return { valid: true };
    }
    return { valid: false, reason: 'CSRF_MISSING_ORIGIN: Origin/Referer-Header fehlt.' };
  }

  const checkUrl = origin || referer;
  if (!checkUrl) return { valid: false, reason: 'CSRF_INVALID_HEADER' };

  try {
    const parsed = new URL(checkUrl);
    if (host && parsed.host.toLowerCase() === host.toLowerCase()) {
      return { valid: true };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      const parsedApp = new URL(appUrl);
      if (parsed.host.toLowerCase() === parsedApp.host.toLowerCase()) {
        return { valid: true };
      }
    }

    // Localhost development allowance
    if (
      process.env.NODE_ENV !== 'production' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      return { valid: true };
    }

    return {
      valid: false,
      reason: `CSRF_ORIGIN_MISMATCH: Ungültige Anfrageherkunft (${parsed.host} != ${host})`,
    };
  } catch {
    return { valid: false, reason: 'CSRF_MALFORMED_HEADER' };
  }
}

/**
 * 2. Step-up Re-Authentication check for sensitive actions
 * Requires authentication within maxAgeMinutes (default: 15 min).
 */
export function isRecentReauth(lastReauthAt: Date | string | null | undefined, maxAgeMinutes = 15): boolean {
  if (!lastReauthAt) return false;
  const date = new Date(lastReauthAt);
  const diffMs = Date.now() - date.getTime();
  return diffMs >= 0 && diffMs <= maxAgeMinutes * 60 * 1000;
}

/**
 * Records a successful re-authentication timestamp.
 */
export async function recordReauth(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { lastReauthAt: new Date() },
  });
}

/**
 * 3. Atomic Session Invalidation: Increments sessionVersion in DB.
 * Immediately invalidates all existing JWTs for this user across all browsers/devices.
 */
export async function revokeUserSessions(userId: string, reason = 'SESSION_REVOCATION'): Promise<number> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
    select: { sessionVersion: true, username: true },
  });

  await recordAuditLog({
    userId,
    action: 'USER_SESSIONS_REVOKED',
    targetType: 'USER',
    targetId: userId,
    details: `Sitzungen für ${updated.username} widerrufen (Neue Version: ${updated.sessionVersion}, Grund: ${reason}).`,
  });

  return updated.sessionVersion;
}

/**
 * 4. Hierarchy & Privilege Escalation Protection
 */
export function canModifyTargetUser(
  actor: UserWithRole,
  targetUser: UserWithRole
): { allowed: boolean; reason?: string } {
  const isActorProjectLead = actor.role.name === 'PROJEKTLEITUNG';
  const isTargetProjectLead = targetUser.role.name === 'PROJEKTLEITUNG';

  // Superadmin protection
  if (isTargetProjectLead && !isActorProjectLead) {
    return {
      allowed: false,
      reason: 'Nur die Projektleitung darf Modifikationen an Projektleitern vornehmen.',
    };
  }

  // Hierarchy enforcement: actor must have strictly higher priority (unless self or Superadmin)
  if (!isActorProjectLead && targetUser.id !== actor.id) {
    if (targetUser.role.priority >= actor.role.priority) {
      return {
        allowed: false,
        reason: 'Hierarchie-Schutz: Du kannst keine Benutzer bearbeiten, deren Rang gleich oder höher als dein eigener ist.',
      };
    }
  }

  return { allowed: true };
}

export function canAssignRole(
  actor: UserWithRole,
  targetRole: { priority: number; name: string }
): { allowed: boolean; reason?: string } {
  if (actor.role.name === 'PROJEKTLEITUNG') return { allowed: true };

  if (targetRole.priority >= actor.role.priority) {
    return {
      allowed: false,
      reason: 'Hierarchie-Schutz: Du kannst keine Rolle vergeben, die gleich oder höher als dein eigener Rang ist.',
    };
  }

  return { allowed: true };
}

/**
 * 5. Last Active Administrator Protection
 * Prevents lockout / deletion / ban of the sole active admin.
 */
export async function isLastActiveAdmin(userId: string): Promise<boolean> {
  const adminRole = await prisma.role.findFirst({
    where: { name: 'PROJEKTLEITUNG' },
  });
  if (!adminRole) return false;

  const count = await prisma.user.count({
    where: {
      roleId: adminRole.id,
      isBanned: false,
      id: { not: userId },
    },
  });

  return count === 0;
}

/**
 * 6. Tamper-Resistant Append-Only Audit Logging
 * Strips sensitive data (passwords, tokens, HMACs) from log details.
 */
export async function recordAuditLog(params: {
  userId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  details?: string;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    let cleanDetails = params.details || '';
    // Strip passwords, tokens, secrets
    cleanDetails = cleanDetails
      .replace(/"password":\s*"[^"]*"/gi, '"password":"[REDACTED]"')
      .replace(/"passwordHash":\s*"[^"]*"/gi, '"passwordHash":"[REDACTED]"')
      .replace(/"token":\s*"[^"]*"/gi, '"token":"[REDACTED]"')
      .replace(/"secret":\s*"[^"]*"/gi, '"secret":"[REDACTED]"')
      .replace(/"twoFactorSecret":\s*"[^"]*"/gi, '"twoFactorSecret":"[REDACTED]"')
      .slice(0, 2000);

    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        targetType: params.targetType || null,
        targetId: params.targetId || null,
        details: cleanDetails,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (err) {
    console.error('AuditLog write error:', err);
  }
}

/**
 * 7. Safe Error Formatting (Prevents stack trace / SQL leak to clients)
 */
export function formatSafeError(
  err: any,
  fallbackMessage = 'Ein interner Serverfehler ist aufgetreten. Bitte versuche es später erneut.'
): { error: string; code?: string } {
  console.error('[SERVER ERROR CAUGHT]', err);

  // In test or non-production, keep message for debugging if wanted, but never leak full stack to response
  if (process.env.NODE_ENV === 'test') {
    return { error: err?.message || fallbackMessage };
  }

  // Never leak Prisma/SQLite internals or file paths
  const msg = err?.message || '';
  if (msg.includes('prisma') || msg.includes('SQLITE_') || msg.includes('UNIQUE constraint') || msg.includes('c:\\')) {
    return { error: fallbackMessage, code: 'INTERNAL_ERROR' };
  }

  // If it's a known user-facing validation error, return it
  if (err?.isSafeUserError) {
    return { error: err.message };
  }

  return { error: fallbackMessage };
}
