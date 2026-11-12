import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { CaptchaService } from '@/lib/captcha/service';
import { CAPTCHA_SESSION_COOKIE } from '@/lib/captcha/constants';
import { getClientIp } from '@/lib/captcha/rateLimiter';
import { recordAuditLog } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const sessionId = req.cookies.get(CAPTCHA_SESSION_COOKIE)?.value || '';
    const { login, captchaChallengeId, captchaResponse } = await req.json();

    // CAPTCHA Prüfung
    if (!captchaChallengeId || !captchaResponse) {
      return NextResponse.json(
        { error: 'Bitte löse die Sicherheitsüberprüfung (CAPTCHA).' },
        { status: 400 }
      );
    }

    const captchaResult = await CaptchaService.verifyCaptcha({
      challengeId: captchaChallengeId,
      response: captchaResponse,
      action: 'FORGOT_PASSWORD',
      sessionId,
      ipAddress: ip,
    });

    if (!captchaResult.success) {
      return NextResponse.json(
        { error: captchaResult.message || 'Sicherheitsüberprüfung fehlgeschlagen. Bitte versuche es erneut.' },
        { status: 400 }
      );
    }

    const cleanLogin = (login || '').trim();
    if (!cleanLogin) {
      return NextResponse.json(
        { error: 'Bitte gib deinen Benutzernamen oder deine E-Mail-Adresse ein.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: cleanLogin } },
          { email: { equals: cleanLogin } },
        ],
      },
    });

    let devToken: string | undefined;

    if (user) {
      // Vorherige ungenutzte Reset-Tokens invalidieren
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      // Kryptografisch zufälligen Einmaltoken erzeugen (32 Bytes = 64 Hex-Zeichen)
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      // Gültigkeit: 15 Minuten
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: {
          tokenHash,
          userId: user.id,
          expiresAt,
        },
      });

      await recordAuditLog({
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        targetType: 'USER',
        targetId: user.id,
        details: `Passwort-Reset angefordert für ${user.username}`,
        ipAddress: ip,
      });

      if (process.env.NODE_ENV !== 'production') {
        devToken = rawToken;
      }
    }

    // Einheitliche Antwort ohne Verrat von Account-Existenz
    const responsePayload: any = {
      success: true,
      message:
        'Falls ein Benutzerkonto mit diesen Angaben existiert, haben wir eine Anleitung zum Zurücksetzen deines Passworts bereitgestellt.',
    };

    if (devToken && process.env.NODE_ENV !== 'production') {
      responsePayload.devResetToken = devToken;
    }

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.' },
      { status: 500 }
    );
  }
}
