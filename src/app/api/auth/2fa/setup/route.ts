import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateTotpSecret, generateQrCodeDataUrl, generateRecoveryCodes } from '@/lib/totp';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    // 1. Neues TOTP Secret generieren
    const secret = generateTotpSecret(20);
    const issuer = 'Vega Crimelife';
    const account = user.email || user.username;
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

    // 2. QR-Code als Data-URL generieren
    const qrCodeUrl = await generateQrCodeDataUrl(otpauthUrl);

    // 3. 8 Backup-Wiederherstellungscodes generieren
    const rawRecoveryCodes = generateRecoveryCodes(8);
    const hashedCodes = await Promise.all(
      rawRecoveryCodes.map((c) => bcrypt.hash(c.replace('-', ''), 10))
    );

    // 4. Temporäres Secret & gehashte Recovery-Codes in DB speichern (noch NICHT aktiviert!)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorTempSecret: secret,
        twoFactorRecoveryCodes: JSON.stringify(hashedCodes),
      },
    });

    return NextResponse.json({
      success: true,
      secret,
      qrCodeUrl,
      recoveryCodes: rawRecoveryCodes,
    });
  } catch (error: any) {
    console.error('2FA setup error:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen der 2FA-Einrichtung.' }, { status: 500 });
  }
}
