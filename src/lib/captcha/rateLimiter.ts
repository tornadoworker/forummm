import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Ermittelt die tatsächliche Client-IP unter Berücksichtigung von Proxies
 */
export function getClientIp(req: NextRequest): string {
  const isTrustedProxy = process.env.TRUSTED_PROXY === 'true';

  if (isTrustedProxy) {
    const cfIp = req.headers.get('cf-connecting-ip');
    if (cfIp) return cfIp.trim();

    const realIp = req.headers.get('x-real-ip');
    if (realIp) return realIp.trim();

    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
      const parts = forwarded.split(',');
      if (parts.length > 0) return parts[0].trim();
    }
  }

  return '127.0.0.1';
}

/**
 * Prüft und erhöht einen Zähler atomar in der Datenbank
 */
export async function checkAndIncrementRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; count: number; remaining: number; resetAt: Date }> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);

  try {
    // 1. Suche nach existierendem aktiven Eintrag
    const existing = await prisma.rateLimitRecord.findUnique({
      where: { key },
    });

    if (!existing || existing.expiresAt < now) {
      // Neuer Eintrag oder alter Eintrag abgelaufen -> zurücksetzen
      await prisma.rateLimitRecord.upsert({
        where: { key },
        update: { count: 1, expiresAt: resetAt },
        create: { key, count: 1, expiresAt: resetAt },
      });

      return {
        allowed: true,
        count: 1,
        remaining: Math.max(0, limit - 1),
        resetAt,
      };
    }

    // Eintrag existiert und ist noch im Zeitfenster
    if (existing.count >= limit) {
      return {
        allowed: false,
        count: existing.count,
        remaining: 0,
        resetAt: existing.expiresAt,
      };
    }

    // Atomares Inkrementieren
    const updated = await prisma.rateLimitRecord.update({
      where: { key },
      data: { count: { increment: 1 } },
    });

    return {
      allowed: true,
      count: updated.count,
      remaining: Math.max(0, limit - updated.count),
      resetAt: existing.expiresAt,
    };
  } catch (err) {
    console.error('Rate limit error:', err);
    // Bei DB-Fehler im sicheren Modus erlauben, aber loggen
    return {
      allowed: true,
      count: 1,
      remaining: 1,
      resetAt,
    };
  }
}

/**
 * Liest den aktuellen Stand eines Zählers aus
 */
export async function getRateLimitCount(key: string): Promise<number> {
  const now = new Date();
  const record = await prisma.rateLimitRecord.findUnique({ where: { key } });
  if (!record || record.expiresAt < now) return 0;
  return record.count;
}

/**
 * Setzt einen Zähler zurück (z.B. nach erfolgreicher Anmeldung)
 */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    await prisma.rateLimitRecord.delete({ where: { key } });
  } catch {
    // Ignorieren falls nicht existent
  }
}

/**
 * Bereinigt abgelaufene Rate-Limits und Challenges periodisch
 */
export async function cleanupExpiredRecords(): Promise<void> {
  const now = new Date();
  try {
    await Promise.all([
      prisma.rateLimitRecord.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
      prisma.captchaChallenge.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { isInvalidated: true },
          ],
        },
      }),
    ]);
  } catch (err) {
    console.error('Cleanup error:', err);
  }
}
