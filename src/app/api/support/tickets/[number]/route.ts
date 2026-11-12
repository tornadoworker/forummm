import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canManageTickets, canViewInternalNotes } from '@/lib/permissions';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const { number: ticketNumber } = await params;
    const isStaff = canManageTickets(user);
    const canSeeNotes = canViewInternalNotes(user);

    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
      include: {
        category: true,
        author: {
          select: { id: true, username: true, avatarUrl: true, role: true, email: true },
        },
        assignedTo: {
          select: { id: true, username: true, role: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          where: canSeeNotes ? {} : { isInternalNote: false }, // STRIKT: Interne Notizen filtern!
          include: {
            author: {
              select: { id: true, username: true, avatarUrl: true, role: true },
            },
          },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { username: true, role: true } },
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden.' }, { status: 404 });
    }

    // Zugriffskontrolle: Nur Autor oder Staff dürfen das Ticket sehen!
    if (!isStaff && ticket.authorId !== user.id) {
      return NextResponse.json({ error: 'Keine Berechtigung für dieses Ticket.' }, { status: 403 });
    }

    // Für normale Nutzer interne AuditLogs & Team-Listen strikt entfernen
    if (!isStaff) {
      (ticket as any).auditLogs = [];
    }

    // Falls Staff, alle verfügbaren Supporter/Admins für Zuweisungs-Dropdown mitliefern
    let availableStaff: any[] = [];
    if (isStaff) {
      availableStaff = await prisma.user.findMany({
        where: { role: { canManageTickets: true } },
        select: { id: true, username: true, role: true },
      });
    }

    const res = NextResponse.json({ ticket, isStaff, canSeeNotes, availableStaff });
    res.headers.set('Cache-Control', 'private, no-store');
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const { number: ticketNumber } = await params;
    const isStaff = canManageTickets(user);

    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden.' }, { status: 404 });
    }

    // Normale Benutzer dürfen nur ihr eigenes Ticket schließen, sonst keine Moderations-Aktionen
    const body = await req.json();
    const updateData: any = {};
    const auditLogs: any[] = [];

    // Status-Änderung
    if (body.status && body.status !== ticket.status) {
      if (!isStaff && (ticket.authorId !== user.id || body.status !== 'CLOSED')) {
        return NextResponse.json({ error: 'Keine Berechtigung zum Ändern des Status.' }, { status: 403 });
      }
      updateData.status = body.status;
      if (body.status === 'CLOSED') {
        updateData.closedAt = new Date();
      } else {
        updateData.closedAt = null;
      }
      auditLogs.push({
        ticketId: ticket.id,
        userId: user.id,
        action: 'STATUS_CHANGE',
        oldValue: ticket.status,
        newValue: body.status,
      });
    }

    // Zuweisung (nur Staff)
    if (body.assignedToId !== undefined && isStaff) {
      updateData.assignedToId = body.assignedToId || null;
      auditLogs.push({
        ticketId: ticket.id,
        userId: user.id,
        action: 'ASSIGN',
        oldValue: ticket.assignedToId,
        newValue: body.assignedToId || 'Niemand',
      });
    }

    // Priorität (nur Staff)
    if (body.priority && body.priority !== ticket.priority && isStaff) {
      updateData.priority = body.priority;
      auditLogs.push({
        ticketId: ticket.id,
        userId: user.id,
        action: 'PRIORITY_CHANGE',
        oldValue: ticket.priority,
        newValue: body.priority,
      });
    }

    await prisma.$transaction([
      prisma.ticket.update({
        where: { id: ticket.id },
        data: updateData,
      }),
      ...auditLogs.map((log) => prisma.ticketAuditLog.create({ data: log })),
    ]);

    // Benachrichtigung an Ticket-Ersteller bei Statusänderung
    if (body.status && ticket.authorId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: ticket.authorId,
          type: 'TICKET_UPDATE',
          title: `Statusänderung bei Ticket ${ticket.ticketNumber}`,
          message: `Der Status deines Tickets wurde auf "${body.status}" geändert.`,
          link: `/support/ticket/${ticket.ticketNumber}`,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Update ticket error:', err);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Tickets.' }, { status: 500 });
  }
}
