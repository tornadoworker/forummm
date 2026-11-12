import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { verifyTotpCode } from '@/lib/totp';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const { code } = await req.json();

    if (!code || !user.twoFactorTempSecret) {
      return NextResponse.json({ error: 'Bitte gib den 6-stelligen Bestätigungscode ein.' }, { status: 400 });
    }

    const isValid = verifyTotpCode(user.twoFactorTempSecret, code);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Ungültiger Bestätigungscode. Bitte prüfe die Uhrzeit deines Geräts und versuche es erneut.' },
        { status: 400 }
      );
    }

    // 2FA endgültig aktivieren
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: user.twoFactorTempSecret,
        twoFactorTempSecret: null,
      },
    });

    // Audit-Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: '2FA_ENABLE',
        targetType: 'USER',
        targetId: user.id,
        details: `Zwei-Faktor-Authentifizierung (TOTP) erfolgreich aktiviert für ${user.username}`,
      },
    });

    return NextResponse.json({ success: true, message: '2FA erfolgreich aktiviert.' });
  } catch (error: any) {
    console.error('2FA verify error:', error);
    return NextResponse.json({ error: 'Fehler bei der 2FA-Verifizierung.' }, { status: 500 });
  }
}
