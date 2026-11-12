import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { recordAuditLog, revokeUserSessions } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword, confirmPassword } = await req.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Ungültiger oder fehlender Token zum Zurücksetzen.' },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Das neue Passwort muss mindestens 6 Zeichen lang sein.' },
        { status: 400 }
      );
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'Die Passwörter stimmen nicht überein.' },
        { status: 400 }
      );
    }

    // Token Hash berechnen und in DB suchen
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { error: 'Dieser Link zum Zurücksetzen des Passworts ist ungültig oder abgelaufen.' },
        { status: 400 }
      );
    }

    // Prüfung auf Einmal-Nutzung (Replay Protection)
    if (resetRecord.usedAt !== null) {
      return NextResponse.json(
        { error: 'Dieser Link zum Zurücksetzen des Passworts wurde bereits verwendet (Replay-Schutz).' },
        { status: 400 }
      );
    }

    // Prüfung auf Ablaufzeit (15 Minuten)
    if (new Date(resetRecord.expiresAt) <= new Date()) {
      return NextResponse.json(
        { error: 'Dieser Link zum Zurücksetzen des Passworts ist abgelaufen. Bitte fordere einen neuen an.' },
        { status: 400 }
      );
    }

    // Sicheres Hashverfahren mit Work Factor 12
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Atomare Transaktion: Token entwerten, Passwort ändern, alle bestehenden Sitzungen widerrufen
    await prisma.$transaction(async (tx) => {
      // 1. Token entwerten
      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      });

      // 2. Passwort aktualisieren und Sitzungsversion inkrementieren (Widerruf aller alten Sitzungen)
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: {
          passwordHash,
          lastPasswordChangeAt: new Date(),
          sessionVersion: { increment: 1 },
        },
      });
    });

    await recordAuditLog({
      userId: resetRecord.userId,
      action: 'PASSWORD_RESET_COMPLETED',
      targetType: 'USER',
      targetId: resetRecord.userId,
      details: `Passwort erfolgreich zurückgesetzt für ${resetRecord.user.username}. Alle bestehenden Sitzungen wurden widerrufen.`,
    });

    return NextResponse.json({
      success: true,
      message: 'Dein Passwort wurde erfolgreich geändert. Du kannst dich nun mit deinem neuen Passwort anmelden.',
    });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return NextResponse.json(
      { error: 'Fehler beim Zurücksetzen des Passworts. Bitte versuche es erneut.' },
      { status: 500 }
    );
  }
}
