/**
 * VEGA Forum – Hauseigenes CAPTCHA System Konstanten
 */

// Erlaubte Zeichen: Keine Verwechslungszeichen wie O/0 und I/l/1
// 31 gut unterscheidbare Großbuchstaben und Ziffern
export const CAPTCHA_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

// Codelänge: Zufällig zwischen 5 und 6 Zeichen
export const CAPTCHA_MIN_LENGTH = 5;
export const CAPTCHA_MAX_LENGTH = 6;

// Gültigkeitsdauer: Maximal 3 Minuten (180 Sekunden)
export const CAPTCHA_TTL_SECONDS = 180;
export const CAPTCHA_TTL_MS = CAPTCHA_TTL_SECONDS * 1000;

// Maximale Antwortversuche pro Challenge
export const CAPTCHA_MAX_ATTEMPTS = 5;

// Cookie-Name für die anonyme / sitzungsbasierte CAPTCHA-Sitzung
export const CAPTCHA_SESSION_COOKIE = '_vga_cpt_sid';

// Unterstützte geschützte Aktionen
export const CAPTCHA_ACTIONS = {
  REGISTER: 'REGISTER',
  LOGIN: 'LOGIN',
  FORGOT_PASSWORD: 'FORGOT_PASSWORD',
  RESEND_CONFIRMATION: 'RESEND_CONFIRMATION',
  CREATE_THREAD: 'CREATE_THREAD',
  CREATE_POST: 'CREATE_POST',
  CREATE_TICKET: 'CREATE_TICKET',
} as const;

export type CaptchaAction = keyof typeof CAPTCHA_ACTIONS | string;

// Rate-Limit Vorgaben
export const CAPTCHA_RATE_LIMITS = {
  CREATE_PER_MIN: 15,       // Max 15 Challenge-Erstellungen pro Minute
  IMAGE_PER_MIN: 20,        // Max 20 Bildabrufe pro Minute
  AUDIO_PER_MIN: 10,        // Max 10 Audioabrufe pro Minute
  VERIFY_PER_MIN: 15,       // Max 15 Antwortprüfungen pro Minute
  LOGIN_FAIL_THRESHOLD: 3,  // Ab 3 Fehlversuchen wird CAPTCHA erzwungen
  LOGIN_FAIL_WINDOW_SEC: 900, // 15 Minuten Zeitfenster für Fehlversuche
  SPAM_POST_THRESHOLD: 2,   // Ab 2 Threads in 3 Minuten wird CAPTCHA erzwungen
  SPAM_POST_WINDOW_SEC: 180,// 3 Minuten Zeitfenster
};
