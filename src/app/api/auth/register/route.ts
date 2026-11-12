import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signSession, setSessionCookie } from '@/lib/auth';
import { CaptchaService } from '@/lib/captcha/service';
import { CAPTCHA_SESSION_COOKIE } from '@/lib/captcha/constants';
import { getClientIp } from '@/lib/captcha/rateLimiter';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const sessionId = req.cookies.get(CAPTCHA_SESSION_COOKIE)?.value || '';
    const { username, email, password, terms, captchaChallengeId, captchaResponse } = await req.json();

    // 0. CAPTCHA Prüfung
    if (!captchaChallengeId || !captchaResponse) {
      return NextResponse.json(
        { error: 'Bitte löse die Sicherheitsüberprüfung (CAPTCHA).' },
        { status: 400 }
      );
    }

    const captchaResult = await CaptchaService.verifyCaptcha({
      challengeId: captchaChallengeId,
      response: captchaResponse,
      action: 'REGISTER',
      sessionId,
      ipAddress: ip,
    });

    if (!captchaResult.success) {
      return NextResponse.json(
        { error: captchaResult.message || 'Sicherheitsüberprüfung fehlgeschlagen. Bitte versuche es erneut.' },
        { status: 400 }
      );
    }

    if (!terms) {
      return NextResponse.json(
        { error: 'Du musst den Nutzungsbedingungen und dem Regelwerk zustimmen.' },
        { status: 400 }
      );
    }

    if (!username || username.trim().length < 3 || username.trim().length > 25) {
      return NextResponse.json(
        { error: 'Der Benutzername muss zwischen 3 und 25 Zeichen lang sein.' },
        { status: 400 }
      );
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      return NextResponse.json(
        { error: 'Bitte gib eine gültige E-Mail-Adresse an.' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Das Passwort muss mindestens 6 Zeichen lang sein.' },
        { status: 400 }
      );
    }

    // Prüfen, ob Benutzername oder E-Mail schon existiert
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: username.trim() } },
          { email: { equals: email.trim() } },
        ],
      },
    });

    if (existing) {
      if (existing.username.toLowerCase() === username.trim().toLowerCase()) {
        return NextResponse.json(
          { error: 'Dieser Benutzername ist bereits vergeben.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Diese E-Mail-Adresse wird bereits verwendet.' },
        { status: 409 }
      );
    }

    // Standardrolle "Mitglied" zuweisen
    const defaultRole = await prisma.role.findUnique({
      where: { name: 'MITGLIED' },
    });

    if (!defaultRole) {
      return NextResponse.json(
        { error: 'Systemfehler: Standardrolle nicht gefunden.' },
        { status: 500 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        roleId: defaultRole.id,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username.trim())}`,
        lastReauthAt: new Date(),
      },
      include: { role: true },
    });

    // Willkommens-Benachrichtigung
    await prisma.notification.create({
      data: {
        userId: newUser.id,
        type: 'ANNOUNCEMENT',
        title: 'Willkommen bei Vega Crimelife!',
        message: 'Dein Forenkonto wurde erfolgreich registriert. Wir wünschen dir viel Spaß im RP und in den Diskussionen!',
        link: '/wiki/grundregeln-rp-verstaendnis',
      },
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: newUser.id,
        action: 'USER_REGISTER',
        details: `Neuer Benutzer registriert: ${newUser.username}`,
      },
    });

    // Sofort einloggen mit sessionVersion
    const token = await signSession({
      userId: newUser.id,
      username: newUser.username,
      roleName: newUser.role.name,
      sessionVersion: newUser.sessionVersion,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role.displayName,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json(
      { error: 'Ein Fehler ist bei der Registrierung aufgetreten.' },
      { status: 500 }
    );
  }
}
