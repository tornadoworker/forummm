import dns from 'dns/promises';
import net from 'net';

/**
 * SSRF Protection Module
 * Blocks requests to private networks, loopbacks, and cloud metadata endpoints.
 */

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'instance-data',
  'metadata.google.internal',
  'metadata.internal',
]);

/**
 * Checks if an IP address belongs to a private, loopback, or reserved range.
 */
export function isPrivateIp(ip: string): boolean {
  if (!ip) return true;

  // Normalize IPv6-mapped IPv4 addresses (::ffff:127.0.0.1)
  const normalizedIp = ip.startsWith('::ffff:') ? ip.slice(7) : ip;

  // IPv4 Checks
  if (net.isIPv4(normalizedIp)) {
    const parts = normalizedIp.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true; // Malformed = dangerous
    }

    const [a, b] = parts;

    // 0.0.0.0/8 - Current network
    if (a === 0) return true;

    // 127.0.0.0/8 - Loopback
    if (a === 127) return true;

    // 10.0.0.0/8 - Private
    if (a === 10) return true;

    // 172.16.0.0/12 - Private (172.16.0.0 - 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16 - Private
    if (a === 192 && b === 168) return true;

    // 169.254.0.0/16 - Link-Local & Cloud Metadata (AWS, GCP, Azure: 169.254.169.254)
    if (a === 169 && b === 254) return true;

    // 100.64.0.0/10 - Carrier-grade NAT
    if (a === 100 && b >= 64 && b <= 127) return true;

    // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 - Documentation
    if (a === 192 && b === 0 && parts[2] === 2) return true;
    if (a === 198 && b === 51 && parts[2] === 100) return true;
    if (a === 203 && b === 0 && parts[2] === 113) return true;

    // 224.0.0.0/4 - Multicast
    if (a >= 224 && a <= 239) return true;

    // 240.0.0.0/4 - Reserved
    if (a >= 240) return true;

    // 255.255.255.255 - Broadcast
    if (normalizedIp === '255.255.255.255') return true;

    return false;
  }

  // IPv6 Checks
  if (net.isIPv6(normalizedIp)) {
    const lower = normalizedIp.toLowerCase();

    // ::1 loopback
    if (lower === '::1' || lower === '0000:0000:0000:0000:0000:0000:0000:0001') return true;
    // :: unspecified
    if (lower === '::' || lower === '0000:0000:0000:0000:0000:0000:0000:0000') return true;
    // Unique local (fc00::/7)
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    // Link-local unicast (fe80::/10)
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
    // Multicast (ff00::/8)
    if (lower.startsWith('ff')) return true;

    return false;
  }

  // Unknown format
  return true;
}

/**
 * Validates a target URL against SSRF attack vectors.
 * Returns { safe: true, resolvedIp } or { safe: false, reason }.
 */
export async function validateSsrfTarget(targetUrl: string): Promise<{
  safe: boolean;
  reason?: string;
  resolvedIp?: string;
  parsedUrl?: URL;
}> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { safe: false, reason: 'Ungültige URL-Syntax.' };
  }

  // Only HTTP and HTTPS
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, reason: `Unzulässiges Protokoll: ${parsed.protocol}` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Blocked names
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return { safe: false, reason: `Zugriff auf internen Host verweigert: ${hostname}` };
  }

  // Direct IP address
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      return { safe: false, reason: `Zugriff auf private IP verweigert: ${hostname}` };
    }
    return { safe: true, resolvedIp: hostname, parsedUrl: parsed };
  }

  // DNS Resolution to check actual target IP
  try {
    const lookup = await dns.lookup(hostname, { all: true });
    if (!lookup || lookup.length === 0) {
      return { safe: false, reason: `Host konnte nicht aufgelöst werden: ${hostname}` };
    }

    for (const entry of lookup) {
      if (isPrivateIp(entry.address)) {
        return {
          safe: false,
          reason: `Host ${hostname} löst zu privater IP auf (${entry.address}). Zugriff verweigert.`,
        };
      }
    }

    return { safe: true, resolvedIp: lookup[0].address, parsedUrl: parsed };
  } catch (err: any) {
    return { safe: false, reason: `DNS-Auflösungsfehler für ${hostname}: ${err.message}` };
  }
}

/**
 * Safe fetch wrapper that enforces SSRF checks and strict timeouts.
 */
export async function safeSsrfFetch(
  targetUrl: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const validation = await validateSsrfTarget(targetUrl);
  if (!validation.safe) {
    throw new Error(`SSRF_BLOCKED: ${validation.reason}`);
  }

  const timeoutMs = options.timeoutMs || 4000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(targetUrl, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Vega-CrimeLife-Security-Client/1.0',
        ...(options.headers || {}),
      },
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}
