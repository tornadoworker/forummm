import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signSession, setSessionCookie, sign2FAPendingToken } from '@/lib/auth';
import { CaptchaService } from '@/lib/captcha/service';
import { CAPTCHA_SESSION_COOKIE } from '@/lib/captcha/constants';
import { getClientIp } from '@/lib/captcha/rateLimiter';

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { searchParams } = new URL(req.url);
  const login = searchParams.get('login') || '';
  const requiresCaptcha = await CaptchaService.isCaptchaRequiredForLogin(login, ip);
  return NextResponse.json({ requiresCaptcha });
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const sessionId = req.cookies.get(CAPTCHA_SESSION_COOKIE)?.value || '';
    const { login, password, rememberMe, captchaChallengeId, captchaResponse } = await req.json();

    const cleanLogin = (login || '').trim();

    if (!cleanLogin || !password) {
      return NextResponse.json(
        { error: 'Bitte Benutzername/E-Mail und Passwort eingeben.' },
        { status: 400 }
      );
    }

    // 1. Prüfen ob CAPTCHA aufgrund vorheriger Fehlversuche erforderlich ist
    const requiresCaptcha = await CaptchaService.isCaptchaRequiredForLogin(cleanLogin, ip);

    if (requiresCaptcha) {
      if (!captchaChallengeId || !captchaResponse) {
        return NextResponse.json(
          {
            error: 'Aufgrund wiederholter Fehlversuche ist eine Sicherheitsprüfung (CAPTCHA) erforderlich.',
            requiresCaptcha: true,
          },
          { status: 400 }
        );
      }

      const captchaResult = await CaptchaService.verifyCaptcha({
        challengeId: captchaChallengeId,
        response: captchaResponse,
        action: 'LOGIN',
        sessionId,
        ipAddress: ip,
      });

      if (!captchaResult.success) {
        await CaptchaService.recordFailedLogin(cleanLogin, ip);
        return NextResponse.json(
          {
            error: captchaResult.message || 'Sicherheitsprüfung fehlgeschlagen. Bitte versuche es erneut.',
            requiresCaptcha: true,
          },
          { status: 400 }
        );
      }
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: cleanLogin } },
          { email: { equals: cleanLogin } },
        ],
      },
      include: { role: true },
    });

    if (!user) {
      // Konstante Ausführungszeit zur Abwehr von Timing-Angriffen / Account-Enumeration
      await bcrypt.compare(password, '$2a$12$e8p2Z3G0eP7fBv2kLqG3r.dummyhashfortimingprevention00000000000');
      const failCount = await CaptchaService.recordFailedLogin(cleanLogin, ip);
      return NextResponse.json(
        {
          error: 'Ungültige Anmeldedaten. Bitte überprüfe Benutzername und Passwort.',
          requiresCaptcha: failCount >= 3,
        },
        { status: 401 }
      );
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: `Dein Account wurde gesperrt. Grund: ${user.banReason || 'Verstoß gegen die Richtlinien'}` },
        { status: 403 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      const failCount = await CaptchaService.recordFailedLogin(cleanLogin, ip);
      return NextResponse.json(
        {
          error: 'Ungültige Anmeldedaten. Bitte überprüfe Benutzername und Passwort.',
          requiresCaptcha: failCount >= 3,
        },
        { status: 401 }
      );
    }

    // Login erfolgreich: Fehlversuche zurücksetzen und Re-Auth Zeitstempel aktualisieren
    await CaptchaService.recordSuccessfulLogin(cleanLogin, ip);
    await prisma.user.update({
      where: { id: user.id },
      data: { lastReauthAt: new Date() },
    });

    // Falls 2FA aktiviert ist: Pending-Token ausstellen & 2FA-Challenge anfordern
    if (user.twoFactorEnabled) {
      const pendingToken = await sign2FAPendingToken({
        userId: user.id,
        rememberMe: rememberMe !== false,
      });

      return NextResponse.json({
        requires2FA: true,
        pendingToken,
        username: user.username,
      });
    }

    // Token erzeugen mit aktueller sessionVersion
    const token = await signSession({
      userId: user.id,
      username: user.username,
      roleName: user.role.name,
      sessionVersion: user.sessionVersion,
    });

    await setSessionCookie(token, rememberMe !== false);

    // Audit Log Eintrag
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        details: `Erfolgreicher Login von Benutzer ${user.username}`,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.displayName,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'Ein interner Serverfehler ist aufgetreten.' },
      { status: 500 }
    );
  }
}
