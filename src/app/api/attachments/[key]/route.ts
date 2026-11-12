import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canManageTickets } from '@/lib/permissions';
import { assertSafePath } from '@/lib/fileSecurity';

export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const { key: storageKey } = await params;

    // Metadaten und Berechtigung aus DB ermitteln
    const attachment = await prisma.privateAttachment.findUnique({
      where: { storageKey },
      include: {
        ticket: { select: { id: true, authorId: true } },
      },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Anhang nicht gefunden.' }, { status: 404 });
    }

    // Zugriffskontrolle: Nur Uploader, Ticket-Autor oder Support-Team
    const isUploader = attachment.uploaderId === user.id;
    const isTicketAuthor = attachment.ticket?.authorId === user.id;
    const isStaff = canManageTickets(user);

    if (!isUploader && !isTicketAuthor && !isStaff) {
      return NextResponse.json({ error: 'Keine Berechtigung zum Herunterladen dieser Datei.' }, { status: 403 });
    }

    // Pfad außerhalb des Webroots validieren
    const storageDir = path.join(process.cwd(), 'storage', 'private_uploads');
    const filePath = assertSafePath(storageDir, storageKey);

    if (!attachment.content && !existsSync(filePath)) {
      return NextResponse.json({ error: 'Datei auf dem Server nicht gefunden.' }, { status: 404 });
    }

    const fileBuffer = attachment.content ?? await readFile(filePath);

    // Sichere Response Header setzen
    const cleanFilename = attachment.originalName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const isImage = attachment.mimeType.startsWith('image/');
    const dispositionType = isImage ? 'inline' : 'attachment';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Length': fileBuffer.length.toString(),
        'Content-Disposition': `${dispositionType}; filename="${cleanFilename}"`,
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
        'Cache-Control': 'private, no-store, max-age=0',
      },
    });
  } catch (err: any) {
    console.error('Attachment delivery error:', err);
    return NextResponse.json({ error: 'Fehler beim Laden des Anhangs.' }, { status: 500 });
  }
}
