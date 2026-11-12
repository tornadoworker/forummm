import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 1V1 | TEAM
    const status = searchParams.get('status'); // REGISTRATION_OPEN | IN_PROGRESS | COMPLETED

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const competitions = await prisma.competition.findMany({
      where,
      include: {
        creator: {
          select: { id: true, username: true, avatarUrl: true, role: true },
        },
        _count: {
          select: { participants: true, matches: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Direkte Herausforderungen / Duelle
    const directMatches = await prisma.competitionMatch.findMany({
      where: {
        competitionId: null,
      },
      include: {
        challenger: {
          select: { id: true, username: true, avatarUrl: true, role: true },
        },
        challenged: {
          select: { id: true, username: true, avatarUrl: true, role: true },
        },
        winner: {
          select: { id: true, username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      competitions,
      directMatches,
    });
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

    const body = await req.json();
    const { action } = body;

    // Aktion 1: Neues Turnier erstellen (durch Staff oder befugte User)
    if (action === 'CREATE_COMPETITION') {
      const { title, description, rules, type, maxParticipants } = body;

      if (!title?.trim()) {
        return NextResponse.json({ error: 'Titel ist erforderlich.' }, { status: 400 });
      }

      const slug =
        title
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') +
        '-' +
        Date.now().toString(36);

      const competition = await prisma.competition.create({
        data: {
          title: title.trim(),
          slug,
          description: description?.trim() || 'Spannender Vega Crimelife Wettbewerb.',
          rules: rules?.trim() || 'Es gelten die allgemeinen Fair-Play- und Serverregeln.',
          type: type === 'TEAM' ? 'TEAM' : '1V1',
          status: 'REGISTRATION_OPEN',
          maxParticipants: Number(maxParticipants) || 16,
          creatorId: user.id,
        },
      });

      return NextResponse.json({ success: true, competition });
    }

    // Aktion 2: 1v1 Direkt-Herausforderung senden
    if (action === 'CHALLENGE_PLAYER') {
      const { targetUsername, notes } = body;
      if (!targetUsername?.trim()) {
        return NextResponse.json({ error: 'Gegner-Benutzername erforderlich.' }, { status: 400 });
      }

      const opponent = await prisma.user.findUnique({
        where: { username: targetUsername.trim() },
      });

      if (!opponent) {
        return NextResponse.json({ error: 'Spieler nicht gefunden.' }, { status: 404 });
      }

      if (opponent.id === user.id) {
        return NextResponse.json({ error: 'Du kannst dich nicht selbst herausfordern.' }, { status: 400 });
      }

      const match = await prisma.competitionMatch.create({
        data: {
          challengerId: user.id,
          challengedId: opponent.id,
          status: 'PENDING',
          resultNotes: notes || null,
        },
        include: {
          challenger: { select: { id: true, username: true, avatarUrl: true } },
          challenged: { select: { id: true, username: true, avatarUrl: true } },
        },
      });

      // Benachrichtigung an Gegner
      await prisma.notification.create({
        data: {
          userId: opponent.id,
          type: 'ANNOUNCEMENT',
          title: 'Neue 1v1 Duell-Herausforderung',
          message: `${user.username} hat dich zu einem 1v1 Duell herausgefordert!`,
          link: '/competitions',
        },
      }).catch(() => {});

      return NextResponse.json({ success: true, match });
    }

    // Aktion 3: Herausforderung annehmen / ablehnen
    if (action === 'RESPOND_CHALLENGE') {
      const { matchId, accept } = body;
      const match = await prisma.competitionMatch.findUnique({ where: { id: matchId } });
      if (!match) {
        return NextResponse.json({ error: 'Duell nicht gefunden.' }, { status: 404 });
      }

      if (match.challengedId !== user.id) {
        return NextResponse.json({ error: 'Nur der Herausgeforderte kann reagieren.' }, { status: 403 });
      }

      const updated = await prisma.competitionMatch.update({
        where: { id: matchId },
        data: {
          status: accept ? 'ACCEPTED' : 'REJECTED',
        },
      });

      return NextResponse.json({ success: true, match: updated });
    }

    return NextResponse.json({ error: 'Unbekannte Aktion.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
