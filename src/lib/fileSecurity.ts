import path from 'path';
import crypto from 'crypto';

/**
 * File Security & Upload Hardening Module
 * Inspects Magic Bytes, blocks executable/script formats (including SVG),
 * prevents path traversal, and manages private uploads outside webroot.
 */

export interface FileValidationResult {
  valid: boolean;
  detectedMime?: string;
  safeExtension?: string;
  error?: string;
}

// Dangerous extensions that must NEVER be allowed under any circumstances
const FORBIDDEN_EXTENSIONS = new Set([
  'svg', 'html', 'htm', 'xhtml', 'shtml', 'php', 'phtml', 'phar', 'php3', 'php4', 'php5', 'php7', 'php8',
  'exe', 'bat', 'cmd', 'sh', 'bash', 'zsh', 'ps1', 'vbs', 'vbe', 'js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx',
  'py', 'pyc', 'pl', 'cgi', 'jar', 'war', 'ear', 'msi', 'com', 'scr', 'hta', 'reg', 'dll', 'so', 'dylib',
  'asp', 'aspx', 'jsp', 'jspx', 'jspa', 'htaccess', 'htpasswd', 'env', 'config', 'xml', 'swf',
]);

/**
 * Detects actual file MIME type from buffer header bytes (Magic Bytes).
 */
export function detectMimeFromBuffer(buffer: Buffer): { mime: string; ext: string } | null {
  if (!buffer || buffer.length < 12) return null;

  // 1. JPEG (FF D8 FF)
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }

  // 2. PNG (89 50 4E 47 0D 0A 1A 0A)
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' };
  }

  // 3. WebP (RIFF....WEBP)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }

  // 4. GIF (GIF87a / GIF89a)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return { mime: 'image/gif', ext: 'gif' };
  }

  return null;
}

/**
 * Validates uploaded image file buffer against magic bytes and permitted formats.
 * Strictly excludes SVGs, HTML, and script-bearing files.
 */
export function validateImageUpload(
  buffer: Buffer,
  originalFilename: string,
  declaredMime: string,
  maxSizeBytes: number = 5 * 1024 * 1024
): FileValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'Die hochgeladene Datei ist leer.' };
  }

  if (buffer.length > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    return { valid: false, error: `Die Datei überschreitet das Limit von ${maxMb} MB.` };
  }

  // Check declared extension
  const ext = path.extname(originalFilename).toLowerCase().replace('.', '');
  if (FORBIDDEN_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Das Dateiformat .${ext} ist aus Sicherheitsgründen strikt gesperrt.` };
  }

  // Check SVG / HTML payload in first 4KB of buffer
  const sample = buffer.slice(0, Math.min(buffer.length, 4096)).toString('utf-8').toLowerCase();
  if (
    sample.includes('<svg') ||
    sample.includes('<html') ||
    sample.includes('<script') ||
    sample.includes('onload=') ||
    sample.includes('onerror=') ||
    sample.includes('<?php')
  ) {
    return { valid: false, error: 'Die Datei enthält unzulässige Skripte oder Markup-Elemente.' };
  }

  // Verify true magic bytes
  const magic = detectMimeFromBuffer(buffer);
  if (!magic) {
    return {
      valid: false,
      error: 'Ungültiges Bildformat. Der Dateiinhalt entspricht keinem gültigen JPEG, PNG oder WebP.',
    };
  }

  // Allowed types: only JPEG, PNG, WebP (and optionally GIF)
  const allowedMimes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  if (!allowedMimes.has(magic.mime)) {
    return { valid: false, error: `Unzulässiger Dateityp: ${magic.mime}` };
  }

  return {
    valid: true,
    detectedMime: magic.mime,
    safeExtension: magic.ext,
  };
}

/**
 * Generates an unguessable safe filename (UUID + verified safe extension).
 */
export function generateSafeStorageKey(safeExtension: string): string {
  const randomHex = crypto.randomBytes(16).toString('hex');
  const cleanExt = safeExtension.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return `${Date.now()}_${randomHex}.${cleanExt}`;
}

/**
 * Validates path traversal: Ensures resolved target path stays within base directory.
 */
export function assertSafePath(baseDir: string, relativePath: string): string {
  const normalizedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(baseDir, relativePath);

  if (!resolvedTarget.startsWith(normalizedBase + path.sep) && resolvedTarget !== normalizedBase) {
    throw new Error('PATH_TRAVERSAL_DETECTED: Pfadmanipulation abgewehrt.');
  }

  return resolvedTarget;
}
