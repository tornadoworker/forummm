/**
 * Fail-Safe Environment & Secrets Validator
 * Checks critical security configuration at server startup.
 */

const isLegacyJwt = (secret: string) => /^(vega-)?crimelife-super-secure-production-/.test(secret);
const developmentJwtKey = crypto.getRandomValues(new Uint8Array(32));

export function getJwtSigningKey() {
  const secret = process.env.JWT_SECRET?.trim();
  if (process.env.NODE_ENV === 'production' &&
      (!secret || secret.length < 32 || isLegacyJwt(secret))) {
    throw new Error('JWT_SECRET muss in Produktion ein eigenes Geheimnis mit mindestens 32 Zeichen sein.');
  }
  return secret ? new TextEncoder().encode(secret) : developmentJwtKey;
}

export interface EnvValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export function validateEnvironment(): EnvValidationResult {
  const isProd = process.env.NODE_ENV === 'production';
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    if (isProd) {
      errors.push('CRITICAL: JWT_SECRET ist in der Produktionsumgebung nicht gesetzt!');
    } else {
      warnings.push('HINWEIS: JWT_SECRET ist nicht gesetzt. Verwende Entwicklungs-Schlüssel.');
    }
  } else if (isLegacyJwt(jwtSecret)) {
    if (isProd) {
      errors.push('CRITICAL: In Produktion wird das standardmäßige JWT_SECRET verwendet. Bitte sofort rotieren!');
    } else {
      warnings.push('HINWEIS: Entwicklungs-JWT_SECRET im Einsatz.');
    }
  } else if (jwtSecret.length < 32) {
    (isProd ? errors : warnings).push('JWT_SECRET benötigt mindestens 32 Zeichen.');
  }

  // 2. CAPTCHA_SECRET
  const captchaSecret = process.env.CAPTCHA_SECRET?.trim();
  if (!captchaSecret) {
    if (isProd) {
      errors.push('CRITICAL: CAPTCHA_SECRET ist in Produktion erforderlich!');
    } else {
      warnings.push('HINWEIS: CAPTCHA_SECRET nicht gesetzt; Standardwert wird genutzt.');
    }
  } else if (captchaSecret.length < 32) {
    (isProd ? errors : warnings).push('CAPTCHA_SECRET benötigt mindestens 32 Zeichen.');
  }

  // 3. DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    errors.push('CRITICAL: DATABASE_URL ist nicht konfiguriert.');
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

