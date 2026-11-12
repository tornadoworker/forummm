import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canManageTickets, canViewInternalNotes } from '@/lib/permissions';
import { CaptchaService } from '@/lib/captcha/service';
import { CAPTCHA_SESSION_COOKIE } from '@/lib/captcha/constants';
import { getClientIp } from '@/lib/captcha/rateLimiter';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const isStaff = canManageTickets(user);

    // Filter: Staff sieht alle, normale User nur eigene
    const tickets = await prisma.ticket.findMany({
      where: isStaff ? {} : { authorId: user.id },
      include: {
        category: true,
        author: {
          select: { id: true, username: true, avatarUrl: true, role: true },
        },
        assignedTo: {
          select: { id: true, username: true, role: true },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ tickets, isStaff });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const ip = getClientIp(req);
    const sessionId = req.cookies.get(CAPTCHA_SESSION_COOKIE)?.value || user.id;

    const {
      categoryId,
      title,
      description,
      affectedPlayer,
      evidenceUrl,
      priority,
      captchaChallengeId,
      captchaResponse,
    } = await req.json();

    // 0. Prüfen ob CAPTCHA aufgrund auffälliger Aktivität nötig ist
    const requiresCaptcha = await CaptchaService.isCaptchaRequiredForAction('CREATE_TICKET', user.id, ip);
    if (requiresCaptcha) {
      if (!captchaChallengeId || !captchaResponse) {
        return NextResponse.json(
          {
            error: 'Aufgrund erhöhter Aktivität ist eine kurze Sicherheitsprüfung (CAPTCHA) erforderlich.',
            requiresCaptcha: true,
          },
          { status: 400 }
        );
      }

      const captchaResult = await CaptchaService.verifyCaptcha({
        challengeId: captchaChallengeId,
        response: captchaResponse,
        action: 'CREATE_TICKET',
        sessionId,
        ipAddress: ip,
      });

      if (!captchaResult.success) {
        return NextResponse.json(
          {
            error: captchaResult.message || 'Sicherheitsprüfung fehlgeschlagen.',
            requiresCaptcha: true,
          },
          { status: 400 }
        );
      }
    }

    if (!categoryId || !title || !description) {
      return NextResponse.json(
        { error: 'Bitte Kategorie, Betreff und Beschreibung ausfüllen.' },
        { status: 400 }
      );
    }

    // Nächste Ticketnummer berechnen
    const count = await prisma.ticket.count();
    const ticketNumber = `CLN-${1000 + count + 1}`;

    const newTicket = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          ticketNumber,
          categoryId,
          authorId: user.id,
          title: title.trim(),
          description: description.trim(),
          affectedPlayer: affectedPlayer?.trim() || null,
          evidenceUrl: evidenceUrl?.trim() || null,
          priority: priority || 'MEDIUM',
          status: 'OPEN',
          messages: {
            create: {
              authorId: user.id,
              content: description.trim(),
              isInternalNote: false,
            },
          },
        },
      });

      // Audit Log
      await tx.ticketAuditLog.create({
        data: {
          ticketId: ticket.id,
          userId: user.id,
          action: 'STATUS_CHANGE',
          newValue: 'OPEN',
        },
      });

      // Benachrichtigung an alle Supporter & Admins
      const staffUsers = await tx.user.findMany({
        where: { role: { canManageTickets: true } },
      });

      for (const s of staffUsers) {
        if (s.id !== user.id) {
          await tx.notification.create({
            data: {
              userId: s.id,
              type: 'TICKET_UPDATE',
              title: 'Neues Support Ticket eingegangen',
              message: `Neues Ticket ${ticket.ticketNumber}: "${ticket.title}"`,
              link: `/support/ticket/${ticket.ticketNumber}`,
            },
          });
        }
      }

      return ticket;
    });

    // Aktion für Spamerkennung registrieren
    await CaptchaService.recordActionForSpamCheck('CREATE_TICKET', user.id, ip);

    return NextResponse.json({ success: true, ticketNumber: newTicket.ticketNumber });
  } catch (err: any) {
    console.error('Create ticket error:', err);
    return NextResponse.json({ error: 'Fehler beim Erstellen des Tickets.' }, { status: 500 });
  }
}
