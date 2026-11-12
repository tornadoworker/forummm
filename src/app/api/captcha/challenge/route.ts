import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { CaptchaService } from '@/lib/captcha/service';
import { CAPTCHA_SESSION_COOKIE } from '@/lib/captcha/constants';
import { getClientIp } from '@/lib/captcha/rateLimiter';

export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'GENERAL';

    // Sitzungs-ID aus Cookie oder neu generieren
    let sessionId = req.cookies.get(CAPTCHA_SESSION_COOKIE)?.value;
    let isNewSession = false;

    if (!sessionId || sessionId.length < 16) {
      sessionId = crypto.randomBytes(24).toString('base64url');
      isNewSession = true;
    }

    const challenge = await CaptchaService.createChallenge({
      action,
      sessionId,
      ipAddress: ip,
    });

    const response = NextResponse.json(
      {
        success: true,
        challengeId: challenge.challengeId,
        expiresAt: challenge.expiresAt,
        audioSupported: challenge.audioSupported,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );

    // Sitzungs-Cookie setzen, falls neu
    if (isNewSession) {
      response.cookies.set(CAPTCHA_SESSION_COOKIE, sessionId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 Stunden gültig
      });
    }

    return response;
  } catch (err: any) {
    const isRateLimit = err.message && err.message.includes('RATE_LIMIT');
    return NextResponse.json(
      {
        error: isRateLimit ? 'RATE_LIMIT_EXCEEDED' : 'CAPTCHA_GENERATION_FAILED',
        message: err.message || 'Sicherheitsabfrage konnte nicht erstellt werden.',
      },
      {
        status: isRateLimit ? 429 : 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}
