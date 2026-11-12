import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const { password } = await req.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Zur Deaktivierung von 2FA musst du dein aktuelles Passwort bestätigen.' },
        { status: 400 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Das eingegebene Passwort ist falsch.' },
        { status: 403 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorTempSecret: null,
        twoFactorRecoveryCodes: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: '2FA_DISABLE',
        targetType: 'USER',
        targetId: user.id,
        details: `Zwei-Faktor-Authentifizierung deaktiviert für ${user.username}`,
      },
    });

    return NextResponse.json({ success: true, message: '2FA erfolgreich deaktiviert.' });
  } catch (error: any) {
    console.error('2FA disable error:', error);
    return NextResponse.json({ error: 'Fehler beim Deaktivieren von 2FA.' }, { status: 500 });
  }
}
