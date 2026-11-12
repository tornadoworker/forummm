import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canManageTickets, canViewInternalNotes } from '@/lib/permissions';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const { number: ticketNumber } = await params;
    const { content, isInternalNote = false, attachmentUrl } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Nachricht darf nicht leer sein.' }, { status: 400 });
    }

    const isStaff = canManageTickets(user);
    const canWriteInternalNote = canViewInternalNotes(user);

    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden.' }, { status: 404 });
    }

    // Zugriffskontrolle: Nur Autor oder Staff
    if (!isStaff && ticket.authorId !== user.id) {
      return NextResponse.json({ error: 'Keine Berechtigung.' }, { status: 403 });
    }

    // Falls versucht wird, eine interne Notiz zu schreiben, prüfen ob berechtigt:
    const internal = Boolean(isInternalNote && canWriteInternalNote);

    // Wenn Ticket geschlossen war, wieder öffnen falls User schreibt
    const newStatus = isStaff
      ? ticket.status === 'WAITING_FOR_STAFF' || ticket.status === 'OPEN'
        ? 'WAITING_FOR_USER'
        : ticket.status
      : 'WAITING_FOR_STAFF';

    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          authorId: user.id,
          content: content.trim(),
          isInternalNote: internal,
          attachmentUrl: attachmentUrl || null,
        },
        include: {
          author: {
            select: { id: true, username: true, avatarUrl: true, role: true },
          },
        },
      });

      // Ticket aktualisieren (updatedAt & ggf. Status)
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          updatedAt: new Date(),
          status: internal ? ticket.status : newStatus, // Interne Notiz ändert den Status für den User nicht
        },
      });

      // Benachrichtigung
      if (!internal) {
        // Wenn Staff antwortet -> User benachrichtigen
        if (isStaff && ticket.authorId !== user.id) {
          await tx.notification.create({
            data: {
              userId: ticket.authorId,
              type: 'TICKET_UPDATE',
              title: `Neue Antwort zu Ticket ${ticket.ticketNumber}`,
              message: `${user.username} hat auf dein Support-Ticket geantwortet.`,
              link: `/support/ticket/${ticket.ticketNumber}`,
            },
          });
        }
        // Wenn User antwortet -> Zugewiesenen Supporter benachrichtigen
        if (!isStaff && ticket.assignedToId) {
          await tx.notification.create({
            data: {
              userId: ticket.assignedToId,
              type: 'TICKET_UPDATE',
              title: `Benutzer hat auf Ticket ${ticket.ticketNumber} geantwortet`,
              message: `${user.username} hat neue Informationen hinterlegt.`,
              link: `/support/ticket/${ticket.ticketNumber}`,
            },
          });
        }
      }

      return msg;
    });

    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    console.error('Ticket message error:', err);
    return NextResponse.json({ error: 'Fehler beim Senden der Antwort.' }, { status: 500 });
  }
}
