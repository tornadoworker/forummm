import crypto from 'crypto';
import { CAPTCHA_CHARS, CAPTCHA_MIN_LENGTH, CAPTCHA_MAX_LENGTH } from './constants';

let cachedSecretWarningEmitted = false;

/**
 * Ruft das konfigurierte HMAC-Geheimnis ab.
 * Schlägt fehl oder warnt prominent, falls nicht konfiguriert.
 */
export function getCaptchaSecret(): string {
  const secret = process.env.CAPTCHA_SECRET;
  if (!secret || secret.trim().length < 16) {
    if (!cachedSecretWarningEmitted) {
      console.warn(
        '⚠️ [SECURITY WARNING] CAPTCHA_SECRET ist nicht oder zu kurz konfiguriert! ' +
        'Bitte setze ein starkes CAPTCHA_SECRET in der .env Datei.'
      );
      cachedSecretWarningEmitted = true;
    }
    // Fallback auf deterministisches Server-Geheimnis basierend auf JWT_SECRET
    const fallback = process.env.JWT_SECRET
      ? crypto.createHash('sha256').update(`cpt_${process.env.JWT_SECRET}`).digest('hex')
      : 'cpt_default_secure_secret_vega_crimelife_2026_fallback';
    return fallback;
  }
  return secret.trim();
}

/**
 * Normalisiert eine Benutzereingabe (Groß-/Kleinschreibung & Whitespace ignorieren)
 */
export function normalizeAnswer(input: string): string {
  return (input || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Erzeugt den HMAC-SHA256 Hash der normalisierten Lösung
 */
export function hashAnswer(answer: string, secret = getCaptchaSecret()): string {
  const normalized = normalizeAnswer(answer);
  return crypto.createHmac('sha256', secret).update(normalized).digest('hex');
}

/**
 * Zeitkonstante (Timing-Safe) Prüfung der Antwort gegen den hinterlegten HMAC
 */
export function verifyAnswerHmac(candidate: string, storedHmac: string, secret = getCaptchaSecret()): boolean {
  if (!candidate || !storedHmac) return false;

  const candidateHmac = hashAnswer(candidate, secret);
  const bufA = Buffer.from(candidateHmac, 'hex');
  const bufB = Buffer.from(storedHmac, 'hex');

  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Erzeugt eine kryptografisch zufällige Challenge ID
 */
export function generateChallengeId(): string {
  return `cpt_${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * Erzeugt einen zufälligen Code aus 5 bis 6 unterscheidbaren Zeichen
 */
export function generateRandomCode(): string {
  const len = crypto.randomInt(CAPTCHA_MIN_LENGTH, CAPTCHA_MAX_LENGTH + 1);
  const chars: string[] = [];

  for (let i = 0; i < len; i++) {
    const idx = crypto.randomInt(0, CAPTCHA_CHARS.length);
    chars.push(CAPTCHA_CHARS[idx]);
  }

  return chars.join('');
}

/**
 * AES-256-GCM Verschlüsselung für flüchtige Server-Darstellung (Bild/Audio)
 * Gewährleistet, dass der Code niemals im Klartext in der Datenbank liegt.
 */
export function encryptPayload(text: string, secret = getCaptchaSecret()): string {
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Format: iv(12) + tag(16) + encrypted
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

/**
 * AES-256-GCM Entschlüsselung
 */
export function decryptPayload(payloadBase64Url: string, secret = getCaptchaSecret()): string | null {
  try {
    const buf = Buffer.from(payloadBase64Url, 'base64url');
    if (buf.length < 28) return null; // iv(12) + tag(16) = 28 Bytes Minimum

    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);

    const key = crypto.createHash('sha256').update(secret).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
  } catch {
    return null;
  }
}
