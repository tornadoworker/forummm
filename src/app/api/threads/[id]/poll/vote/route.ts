import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const { optionId } = await req.json();
    if (!optionId) {
      return NextResponse.json({ error: 'Option auswählen.' }, { status: 400 });
    }

    const pollOption = await prisma.pollOption.findUnique({
      where: { id: optionId },
      include: { poll: true },
    });

    if (!pollOption) {
      return NextResponse.json({ error: 'Option nicht gefunden.' }, { status: 404 });
    }

    // Prüfen, ob der User bei dieser Umfrage bereits abgestimmt hat
    const existingVote = await prisma.pollVote.findFirst({
      where: {
        userId: user.id,
        pollOption: { pollId: pollOption.pollId },
      },
    });

    if (existingVote) {
      return NextResponse.json(
        { error: 'Du hast an dieser Umfrage bereits teilgenommen.' },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.pollVote.create({
        data: {
          pollOptionId: optionId,
          userId: user.id,
        },
      }),
      prisma.pollOption.update({
        where: { id: optionId },
        data: { votesCount: { increment: 1 } },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Poll vote error:', err);
    return NextResponse.json({ error: 'Fehler bei der Stimmabgabe.' }, { status: 500 });
  }
}
