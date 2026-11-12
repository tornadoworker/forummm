import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const competition = await prisma.competition.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        creator: {
          select: { id: true, username: true, avatarUrl: true, role: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, username: true, avatarUrl: true, role: true },
            },
          },
          orderBy: [{ points: 'desc' }, { wins: 'desc' }],
        },
        matches: {
          include: {
            challenger: { select: { id: true, username: true, avatarUrl: true } },
            challenged: { select: { id: true, username: true, avatarUrl: true } },
            winner: { select: { id: true, username: true } },
          },
          orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
        },
      },
    });

    if (!competition) {
      return NextResponse.json({ error: 'Wettbewerb nicht gefunden.' }, { status: 404 });
    }

    return NextResponse.json({ competition });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    const competition = await prisma.competition.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        _count: { select: { participants: true } },
      },
    });

    if (!competition) {
      return NextResponse.json({ error: 'Wettbewerb nicht gefunden.' }, { status: 404 });
    }

    // Aktion: Beitreten
    if (action === 'JOIN') {
      if (competition.status !== 'REGISTRATION_OPEN') {
        return NextResponse.json({ error: 'Anmeldung für diesen Wettbewerb ist geschlossen.' }, { status: 400 });
      }

      if (competition._count.participants >= competition.maxParticipants) {
        return NextResponse.json({ error: 'Maximale Teilnehmerzahl bereits erreicht.' }, { status: 400 });
      }

      const existing = await prisma.competitionParticipant.findUnique({
        where: {
          competitionId_userId: {
            competitionId: competition.id,
            userId: user.id,
          },
        },
      });

      if (existing) {
        return NextResponse.json({ error: 'Du bist diesem Wettbewerb bereits beigetreten.' }, { status: 400 });
      }

      const participant = await prisma.competitionParticipant.create({
        data: {
          competitionId: competition.id,
          userId: user.id,
          teamName: body.teamName?.trim() || null,
        },
      });

      return NextResponse.json({ success: true, participant });
    }

    // Aktion: Verlassen
    if (action === 'LEAVE') {
      if (competition.status !== 'REGISTRATION_OPEN') {
        return NextResponse.json({ error: 'Wettbewerb läuft bereits oder ist beendet.' }, { status: 400 });
      }

      await prisma.competitionParticipant.deleteMany({
        where: {
          competitionId: competition.id,
          userId: user.id,
        },
      });

      return NextResponse.json({ success: true, message: 'Erfolgreich abgemeldet.' });
    }

    return NextResponse.json({ error: 'Ungültige Aktion.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
