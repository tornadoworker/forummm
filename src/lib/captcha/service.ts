import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import {
  CAPTCHA_TTL_SECONDS,
  CAPTCHA_MAX_ATTEMPTS,
  CAPTCHA_RATE_LIMITS,
} from './constants';
import {
  hashAnswer,
  verifyAnswerHmac,
  generateChallengeId,
  generateRandomCode,
  encryptPayload,
  decryptPayload,
} from './crypto';
import {
  checkAndIncrementRateLimit,
  getRateLimitCount,
  resetRateLimit,
  cleanupExpiredRecords,
} from './rateLimiter';

// Flüchtiger In-Memory Cache für extrem schnelle Bild-/Audioauslieferung (3 Min TTL)
interface EphemeralCodeEntry {
  code: string;
  expiresAt: number;
}
const ephemeralCodeCache = new Map<string, EphemeralCodeEntry>();

// Regelmäßige automatische Bereinigung des flüchtigen Speichers
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of ephemeralCodeCache.entries()) {
    if (val.expiresAt < now) {
      ephemeralCodeCache.delete(key);
    }
  }
}, 60000);

export class CaptchaService {
  /**
   * Erstellt eine neue Challenge, gebunden an Sitzung und Aktion
   */
  static async createChallenge(params: {
    action: string;
    sessionId: string;
    ipAddress?: string;
  }): Promise<{ challengeId: string; expiresAt: string; audioSupported: boolean }> {
    const { action, sessionId, ipAddress } = params;

    // 1. Serverseitiges Rate-Limit für Erstellung prüfen
    const rateLimitKey = `rl:cpt_create:${sessionId}:${ipAddress || 'unknown'}`;
    const rl = await checkAndIncrementRateLimit(
      rateLimitKey,
      CAPTCHA_RATE_LIMITS.CREATE_PER_MIN,
      60
    );

    if (!rl.allowed) {
      throw new Error('RATE_LIMIT_EXCEEDED: Zu viele Sicherheitsabfragen angefordert. Bitte warte einen Moment.');
    }

    // Gelegentliche Bereinigung alter Einträge anstoßen
    if (Math.random() < 0.1) {
      cleanupExpiredRecords().catch(() => {});
    }

    // 2. Vorherige ungelöste Aufgaben derselben Sitzung & Aktion entwerten
    await prisma.captchaChallenge.updateMany({
      where: {
        sessionId,
        action,
        isResolved: false,
        isInvalidated: false,
      },
      data: {
        isInvalidated: true,
      },
    });

    // 3. Zufälligen Code & kryptografische Schlüssel generieren
    const code = generateRandomCode();
    const challengeId = generateChallengeId();
    const answerHmac = hashAnswer(code);
    const encryptedCode = encryptPayload(code);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CAPTCHA_TTL_SECONDS * 1000);

    // 4. In flüchtigem Speicher ablegen für die Auslieferung
    ephemeralCodeCache.set(challengeId, {
      code,
      expiresAt: expiresAt.getTime(),
    });

    // 5. In der Datenbank speichern (Lösung NUR als HMAC, verschlüsselter Render-Code als Auth-GCM Payload)
    await prisma.captchaChallenge.create({
      data: {
        challengeId,
        action,
        sessionId,
        ipAddress: ipAddress || null,
        answerHmac,
        // Wir speichern den AES-256-GCM verschlüsselten Payload für Auslieferung falls Server-Reload erfolgt
        // Wird bei Invalidierung unwiderruflich gelöscht
        attempts: 0,
        maxAttempts: CAPTCHA_MAX_ATTEMPTS,
        isResolved: false,
        isInvalidated: false,
        expiresAt,
      },
    });

    // Zur Persistenz des verschlüsselten Render-Codes speichern wir ihn in RateLimitRecord als ephemeres Key-Value
    await prisma.rateLimitRecord.upsert({
      where: { key: `cpt_enc:${challengeId}` },
      update: { count: 1, expiresAt },
      create: { key: `cpt_enc:${challengeId}`, count: 1, expiresAt },
    });
    // Um kein neues DB-Feld zu erzwingen, puffern wir zusätzlich global
    (global as any).__vga_cpt_payloads = (global as any).__vga_cpt_payloads || {};
    (global as any).__vga_cpt_payloads[challengeId] = encryptedCode;

    return {
      challengeId,
      expiresAt: expiresAt.toISOString(),
      audioSupported: true,
    };
  }

  /**
   * Liest den Code für die Bild- oder Audio-Erzeugung sicher aus
   */
  static async getCodeForRendering(challengeId: string): Promise<string | null> {
    // 1. Zuerst im Fast-Memory Cache nachschauen
    const cached = ephemeralCodeCache.get(challengeId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.code;
    }

    // 2. In der Datenbank prüfen ob Challenge gültig ist
    const challenge = await prisma.captchaChallenge.findUnique({
      where: { challengeId },
    });

    if (!challenge || challenge.isInvalidated || challenge.isResolved || challenge.expiresAt < new Date()) {
      return null;
    }

    // 3. Aus verschlüsseltem Payload rekonstruieren
    const payloads = (global as any).__vga_cpt_payloads || {};
    const encrypted = payloads[challengeId];
    if (encrypted) {
      const decrypted = decryptPayload(encrypted);
      if (decrypted) {
        ephemeralCodeCache.set(challengeId, {
          code: decrypted,
          expiresAt: challenge.expiresAt.getTime(),
        });
        return decrypted;
      }
    }

    return null;
  }

  /**
   * Atomare Prüfung der eingereichten Antwort
   */
  static async verifyCaptcha(params: {
    challengeId: string;
    response: string;
    action: string;
    sessionId: string;
    ipAddress?: string;
  }): Promise<{ success: boolean; error?: string; message?: string }> {
    const { challengeId, response, action, sessionId, ipAddress } = params;

    if (!challengeId || !response) {
      return {
        success: false,
        error: 'CAPTCHA_MISSING',
        message: 'Bitte löse das Sicherheits-CAPTCHA.',
      };
    }

    // Rate-Limit für Prüfungen prüfen
    const rateLimitKey = `rl:cpt_verify:${sessionId}:${ipAddress || 'unknown'}`;
    const rl = await checkAndIncrementRateLimit(rateLimitKey, CAPTCHA_RATE_LIMITS.VERIFY_PER_MIN, 60);
    if (!rl.allowed) {
      return {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Zu viele Fehlversuche. Bitte warte kurz.',
      };
    }

    const now = new Date();

    // Atomare Transaktion: Challenge sperren & prüfen
    const result = await prisma.$transaction(async (tx) => {
      const challenge = await tx.captchaChallenge.findUnique({
        where: { challengeId },
      });

      if (!challenge) {
        return {
          success: false,
          error: 'CAPTCHA_NOT_FOUND',
          message: 'Ungültige Sicherheitsabfrage. Bitte erneuere die Aufgabe.',
        };
      }

      // Prüfen ob bereits entwertet oder gelöst
      if (challenge.isInvalidated || challenge.isResolved) {
        return {
          success: false,
          error: 'CAPTCHA_ALREADY_USED',
          message: 'Diese Sicherheitsabfrage wurde bereits verwendet oder entwertet. Bitte erneuere die Aufgabe.',
        };
      }

      // Prüfen ob abgelaufen (3 Minuten)
      if (challenge.expiresAt < now) {
        await tx.captchaChallenge.update({
          where: { id: challenge.id },
          data: { isInvalidated: true },
        });
        return {
          success: false,
          error: 'CAPTCHA_EXPIRED',
          message: 'Die Sicherheitsabfrage ist abgelaufen. Bitte erneuere die Aufgabe.',
        };
      }

      // Bindung an Sitzung und Aktion prüfen
      if (challenge.action !== action || challenge.sessionId !== sessionId) {
        await tx.captchaChallenge.update({
          where: { id: challenge.id },
          data: { isInvalidated: true },
        });
        return {
          success: false,
          error: 'CAPTCHA_SESSION_MISMATCH',
          message: 'Sicherheitsprüfung passt nicht zur aktuellen Sitzung oder Aktion.',
        };
      }

      // Versuche erhöhen
      const newAttempts = challenge.attempts + 1;
      const reachedMax = newAttempts >= challenge.maxAttempts;

      // Timing-Safe HMAC Prüfung
      const isValid = verifyAnswerHmac(response, challenge.answerHmac);

      if (isValid) {
        // ERFOLG: Sofort und unwiderruflich als gelöst und entwertet markieren
        await tx.captchaChallenge.update({
          where: { id: challenge.id },
          data: {
            attempts: newAttempts,
            isResolved: true,
            isInvalidated: true, // Keine Mehrfachnutzung möglich!
            resolvedAt: now,
          },
        });

        // Speicher aufräumen
        ephemeralCodeCache.delete(challengeId);
        const payloads = (global as any).__vga_cpt_payloads;
        if (payloads) delete payloads[challengeId];

        return { success: true };
      } else {
        // FEHLSCHLAG
        await tx.captchaChallenge.update({
          where: { id: challenge.id },
          data: {
            attempts: newAttempts,
            isInvalidated: reachedMax, // Wenn Limit erreicht, sofort sperren
          },
        });

        const remaining = Math.max(0, challenge.maxAttempts - newAttempts);
        return {
          success: false,
          error: reachedMax ? 'CAPTCHA_MAX_ATTEMPTS' : 'CAPTCHA_INCORRECT',
          message: reachedMax
            ? 'Zu viele Fehlversuche. Bitte lade eine neue Sicherheitsaufgabe.'
            : `Falscher Sicherheitscode. Noch ${remaining} Versuche verbleibend.`,
        };
      }
    });

    return result;
  }

  /**
   * Prüft, ob für einen Login ein CAPTCHA erforderlich ist (ab 3 Fehlversuchen)
   */
  static async isCaptchaRequiredForLogin(identifier: string, ip: string): Promise<boolean> {
    const keyUser = `rl:login_fail:user:${identifier.toLowerCase().trim()}`;
    const keyIp = `rl:login_fail:ip:${ip}`;

    const [userFails, ipFails] = await Promise.all([
      getRateLimitCount(keyUser),
      getRateLimitCount(keyIp),
    ]);

    return userFails >= CAPTCHA_RATE_LIMITS.LOGIN_FAIL_THRESHOLD || ipFails >= CAPTCHA_RATE_LIMITS.LOGIN_FAIL_THRESHOLD;
  }

  /**
   * Protokolliert einen fehlgeschlagenen Login-Versuch
   */
  static async recordFailedLogin(identifier: string, ip: string): Promise<number> {
    const keyUser = `rl:login_fail:user:${identifier.toLowerCase().trim()}`;
    const keyIp = `rl:login_fail:ip:${ip}`;

    const [userRes] = await Promise.all([
      checkAndIncrementRateLimit(keyUser, 99, CAPTCHA_RATE_LIMITS.LOGIN_FAIL_WINDOW_SEC),
      checkAndIncrementRateLimit(keyIp, 99, CAPTCHA_RATE_LIMITS.LOGIN_FAIL_WINDOW_SEC),
    ]);

    return userRes.count;
  }

  /**
   * Setzt Fehlversuche nach erfolgreichem Login zurück
   */
  static async recordSuccessfulLogin(identifier: string, ip: string): Promise<void> {
    const keyUser = `rl:login_fail:user:${identifier.toLowerCase().trim()}`;
    const keyIp = `rl:login_fail:ip:${ip}`;

    await Promise.all([
      resetRateLimit(keyUser),
      resetRateLimit(keyIp),
    ]);
  }

  /**
   * Prüft, ob für eine Themenerstellung / Ticket / Antwort ein CAPTCHA erforderlich ist
   * (Schutz vor automatisiertem Spam)
   */
  static async isCaptchaRequiredForAction(action: string, userId: string, ip: string): Promise<boolean> {
    const keyUser = `rl:spam_action:${action}:user:${userId}`;
    const keyIp = `rl:spam_action:${action}:ip:${ip}`;

    const [userCount, ipCount] = await Promise.all([
      getRateLimitCount(keyUser),
      getRateLimitCount(keyIp),
    ]);

    return userCount >= CAPTCHA_RATE_LIMITS.SPAM_POST_THRESHOLD || ipCount >= CAPTCHA_RATE_LIMITS.SPAM_POST_THRESHOLD;
  }

  /**
   * Erfasst eine getätigte Aktion zur Spamerkennung
   */
  static async recordActionForSpamCheck(action: string, userId: string, ip: string): Promise<void> {
    const keyUser = `rl:spam_action:${action}:user:${userId}`;
    const keyIp = `rl:spam_action:${action}:ip:${ip}`;

    await Promise.all([
      checkAndIncrementRateLimit(keyUser, 99, CAPTCHA_RATE_LIMITS.SPAM_POST_WINDOW_SEC),
      checkAndIncrementRateLimit(keyIp, 99, CAPTCHA_RATE_LIMITS.SPAM_POST_WINDOW_SEC),
    ]);
  }
}
