import { cache } from 'react';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

import { getJwtSigningKey } from './env';

export const COOKIE_NAME = 'cln_session';
export const DISCORD_2FA_COOKIE = 'cln_discord_2fa';

export interface SessionPayload {
  userId: string;
  username: string;
  roleName: string;
  sessionVersion?: number;
  authTime?: number;
}

export interface TwoFactorPendingPayload {
  userId: string;
  rememberMe: boolean;
  purpose: '2fa_challenge';
}

/**
 * Signs a hardened session JWT with user ID, username, role, sessionVersion and auth timestamp.
 */
export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    ...payload,
    authTime: payload.authTime || Math.floor(Date.now() / 1000),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSigningKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSigningKey());
    if (
      payload.purpose === '2fa_challenge' ||
      typeof payload.userId !== 'string' ||
      typeof payload.username !== 'string' ||
      typeof payload.roleName !== 'string'
    ) {
      return null;
    }
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function sign2FAPendingToken(payload: { userId: string; rememberMe: boolean }): Promise<string> {
  return new SignJWT({ ...payload, purpose: '2fa_challenge' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(getJwtSigningKey());
}

export async function verify2FAPendingToken(token: string): Promise<TwoFactorPendingPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSigningKey());
    if ((payload as any).purpose !== '2fa_challenge') return null;
    return payload as unknown as TwoFactorPendingPayload;
  } catch {
    return null;
  }
}

/**
 * Retrieves the currently authenticated user from cookie session.
 * Enforces immediate session invalidation if:
 * 1. The user was banned.
 * 2. The user's role was changed or session was revoked (sessionVersion mismatch).
 * 3. The account no longer exists.
 * 4. Inactivity period exceeded.
 */
export const getCurrentUser = cache(async function getCurrentUserImpl() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifySession(token);
  if (!session?.userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        role: true,
      },
    });

    if (!user) {
      await clearSessionCookie();
      return null;
    }

    // 1. Sofortiger Sperr-Check
    // Automatische Aufhebung abgelaufener temporärer Sperren
    if (user.isBanned && user.bannedUntil && new Date(user.bannedUntil) <= new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isBanned: false, banReason: null, bannedUntil: null },
      });
      user.isBanned = false;
      user.banReason = null;
      user.bannedUntil = null;
    }

    if (user.isBanned) {
      await clearSessionCookie();
      return null;
    }

    // 2. Sitzungs-Version Validierung (Sofort-Invalidierung bei Rollenänderung, PW-Reset oder Sperre)
    if (
      session.sessionVersion !== undefined &&
      user.sessionVersion !== undefined &&
      session.sessionVersion !== user.sessionVersion
    ) {
      // Sitzung wurde durch Rollenänderung, Kontosperre oder manuellen Logout widerrufen
      await clearSessionCookie();
      return null;
    }

    // 3. Automatische Aufhebung abgelaufener Stummschaltungen
    if (user.isMuted && user.mutedUntil && new Date(user.mutedUntil) <= new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isMuted: false, mutedUntil: null },
      });
      user.isMuted = false;
      user.mutedUntil = null;
    }

    // 4. Inaktivitäts-Check (Maximal 14 Tage Inaktivität)
    const MAX_INACTIVITY_MS = 14 * 24 * 60 * 60 * 1000;
    const lastActiveMs = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
    if (lastActiveMs > 0 && Date.now() - lastActiveMs > MAX_INACTIVITY_MS) {
      await clearSessionCookie();
      return null;
    }

    // Last Active Update maximal alle 60 Sekunden im Hintergrund (verhindert SQLite Write-Locks)
    if (Date.now() - lastActiveMs > 60_000) {
      prisma.user
        .update({
          where: { id: user.id },
          data: { lastActiveAt: new Date() },
        })
        .catch(() => {});
    }

    return user;
  } catch (err) {
    console.error('Error fetching current user:', err);
    return null;
  }
});

/**
 * Sets a hardened HTTP-only SameSite=lax cookie.
 */
export async function setSessionCookie(token: string, rememberMe = true) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24, // 30 Tage vs 1 Tag
  });
}

export async function clearSessionCookie() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
  } catch {
    // Falls Aufruf in Kontext ohne schreibende Cookies erfolgt
  }
}
