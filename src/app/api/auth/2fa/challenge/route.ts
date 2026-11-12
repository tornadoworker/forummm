import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { verifyTotpCode } from '@/lib/totp';
import { verify2FAPendingToken, signSession, setSessionCookie, DISCORD_2FA_COOKIE } from '@/lib/auth';
import { checkAndIncrementRateLimit } from '@/lib/captcha/rateLimiter';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body;
    const pendingToken = body.pendingToken || req.cookies.get(DISCORD_2FA_COOKIE)?.value;

    if (!pendingToken || !code) {
      return NextResponse.json(
        { error: 'Bitte gib deinen Authentifizierungscode ein.' },
        { status: 400 }
      );
    }

    const pendingPayload = await verify2FAPendingToken(pendingToken);
    if (!pendingPayload || !pendingPayload.userId) {
      return NextResponse.json(
        { error: 'Die 2FA-Sitzung ist abgelaufen. Bitte melde dich erneut an.' },
        { status: 401 }
      );
    }

    const { allowed } = await checkAndIncrementRateLimit(`2fa:${pendingPayload.userId}`, 8, 600);
    if (!allowed) {
      return NextResponse.json({ error: 'Zu viele Versuche. Bitte versuche es später erneut.' }, { status: 429 });
    }

    const user = await prisma.user.findUnique({
      where: { id: pendingPayload.userId },
      include: { role: true },
    });

    if (!user || user.isBanned) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden oder gesperrt.' },
        { status: 403 }
      );
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: 'Zwei-Faktor-Authentifizierung ist für dieses Konto nicht aktiv.' },
        { status: 400 }
      );
    }

    const cleanCode = code.toString().trim().replace(/\s+/g, '');
    let isValid = false;
    let usedRecoveryCode = false;

    // 1. Check if 6-digit TOTP
    if (/^\d{6}$/.test(cleanCode)) {
      isValid = verifyTotpCode(user.twoFactorSecret, cleanCode);
    }

    // 2. If not valid TOTP, check if it's a backup recovery code
    if (!isValid && user.twoFactorRecoveryCodes) {
      try {
        const storedHashes: string[] = JSON.parse(user.twoFactorRecoveryCodes);
        const normalizedRecoveryCode = cleanCode.replace(/-/g, '').toUpperCase();

        for (let i = 0; i < storedHashes.length; i++) {
          const isMatch = await bcrypt.compare(normalizedRecoveryCode, storedHashes[i]);
          if (isMatch) {
            isValid = true;
            usedRecoveryCode = true;
            // Remove used recovery code
            const updatedHashes = storedHashes.filter((_, index) => index !== i);
            await prisma.user.update({
              where: { id: user.id },
              data: { twoFactorRecoveryCodes: JSON.stringify(updatedHashes) },
            });
            break;
          }
        }
      } catch (err) {
        console.error('Error parsing recovery codes:', err);
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Ungültiger Code. Bitte überprüfe die Eingabe in deiner Authenticator-App oder verwende einen Backup-Code.' },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastReauthAt: new Date() },
    });

    // Sign actual session with sessionVersion
    const sessionToken = await signSession({
      userId: user.id,
      username: user.username,
      roleName: user.role.name,
      sessionVersion: user.sessionVersion,
    });

    await setSessionCookie(sessionToken, pendingPayload.rememberMe);

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN_2FA',
        details: `2FA Login erfolgreich für ${user.username} (${usedRecoveryCode ? 'Backup-Code verwendet' : 'TOTP Authenticator'})`,
      },
    });

    const response = NextResponse.json({
      success: true,
      usedRecoveryCode,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.displayName,
      },
    });
    response.cookies.delete(DISCORD_2FA_COOKIE);
    return response;
  } catch (err: any) {
    console.error('2FA challenge error:', err);
    return NextResponse.json(
      { error: 'Ein Fehler ist bei der Zwei-Faktor-Authentifizierung aufgetreten.' },
      { status: 500 }
    );
  }
}
