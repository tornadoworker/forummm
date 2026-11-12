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
      return NextResponse.json(
        { error: 'Dein Konto ist gesperrt. Du kannst keine Dateien hochladen.' },
        { status: 403 }
      );
    }

    if (user.isMuted) {
      return NextResponse.json(
        { error: 'Dein Konto ist stummgeschaltet. Du kannst keine Anhänge hochladen.' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei ausgewählt.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Magic Bytes & Script-Sicherheitsüberprüfung (Max 10 MB)
    const validation = validateImageUpload(buffer, file.name, file.type, 10 * 1024 * 1024);
    if (!validation.valid || !validation.safeExtension || !validation.detectedMime) {
      return NextResponse.json(
        { error: validation.error || 'Ungültiges Dateiformat. Erlaubt sind JPG, PNG, WebP und GIF.' },
        { status: 400 }
      );
    }

    const safeFileName = `forum_${generateSafeStorageKey(validation.safeExtension)}`;
    const publicUrl = `/uploads/attachments/${safeFileName}`;
    await prisma.$transaction([
      prisma.publicUpload.create({ data: { url: publicUrl, mimeType: validation.detectedMime, content: buffer } }),
      prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'ATTACHMENT_UPLOAD',
          targetType: 'ATTACHMENT',
          details: `Datei "${file.name}" (${validation.detectedMime}, ${(buffer.length / 1024).toFixed(1)} KB) von ${user.username} hochgeladen.`,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: file.name,
      fileSize: buffer.length,
      mimeType: validation.detectedMime,
    });
  } catch (error: any) {
    console.error('Forum upload error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Hochladen der Datei auf den Server.' },
      { status: 500 }
    );
  }
}
