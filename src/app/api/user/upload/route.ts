import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateImageUpload, generateSafeStorageKey } from '@/lib/fileSecurity';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    if (user.isBanned) {
      return NextResponse.json({ error: 'Gesperrte Konten können keine Bilder hochladen.' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') === 'banner' ? 'banner' : 'avatar';

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei ausgewählt.' }, { status: 400 });
    }

    const subDir = type === 'banner' ? 'banners' : 'avatars';
    const maxSizeBytes = type === 'banner' ? 6 * 1024 * 1024 : 4 * 1024 * 1024;

    // Buffer einlesen
    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Strenge Validierung: Magic Bytes, SVG-Ausschluss, Script-Scan & Dateigröße
    const validation = validateImageUpload(buffer, file.name, file.type, maxSizeBytes);
    if (!validation.valid || !validation.safeExtension || !validation.detectedMime) {
      return NextResponse.json(
        { error: validation.error || 'Ungültige Datei.' },
        { status: 400 }
      );
    }

    const fileName = `${type}_${user.id}_${generateSafeStorageKey(validation.safeExtension)}`;
    const publicUrl = `/uploads/${subDir}/${fileName}`;
    const field = type === 'banner' ? 'bannerUrl' : 'avatarUrl';
    const mimeType = validation.detectedMime;
    await prisma.$transaction(async (tx) => {
      await tx.publicUpload.create({ data: { url: publicUrl, mimeType, content: buffer } });
      await tx.user.update({ where: { id: user.id, [field]: user[field] }, data: { [field]: publicUrl } });
      if (user[field]?.startsWith(`/uploads/${subDir}/`)) {
        await tx.publicUpload.deleteMany({ where: { url: user[field] } });
      }
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: type === 'banner' ? 'USER_BANNER_UPLOAD' : 'USER_AVATAR_UPLOAD',
          targetType: 'USER',
          targetId: user.id,
          details: `Benutzer ${user.username} hat ein neues ${type === 'banner' ? 'Profilbanner' : 'Profilbild'} hochgeladen (${mimeType}, ${(buffer.length / 1024).toFixed(1)} KB).`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      url: publicUrl,
      message: `${type === 'banner' ? 'Profilbanner' : 'Avatar'} erfolgreich hochgeladen.`,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Hochladen der Datei. Bitte versuche es erneut.' },
      { status: 500 }
    );
  }
}
