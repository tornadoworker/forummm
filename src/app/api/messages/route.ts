import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const conversations = await prisma.conversationParticipant.findMany({
      where: { userId: user.id },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: { id: true, username: true, avatarUrl: true, role: true },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                sender: { select: { username: true } },
              },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    return NextResponse.json({ conversations });
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

    const { recipientUsername, title, content } = await req.json();

    if (!recipientUsername || !content) {
      return NextResponse.json(
        { error: 'Empfänger und Nachricht müssen angegeben werden.' },
        { status: 400 }
      );
    }

    const recipient = await prisma.user.findUnique({
      where: { username: recipientUsername.trim() },
    });

    if (!recipient) {
      return NextResponse.json({ error: 'Empfänger nicht gefunden.' }, { status: 404 });
    }

    if (recipient.id === user.id) {
      return NextResponse.json(
        { error: 'Du kannst dir nicht selbst eine Nachricht schreiben.' },
        { status: 400 }
      );
    }

    const conv = await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: {
          title: title?.trim() || `Unterhaltung mit ${recipient.username}`,
          participants: {
            create: [{ userId: user.id }, { userId: recipient.id }],
          },
          messages: {
            create: {
              senderId: user.id,
              content: content.trim(),
            },
          },
        },
      });

      // Benachrichtigung an Empfänger
      await tx.notification.create({
        data: {
          userId: recipient.id,
          type: 'DM',
          title: 'Neue private Nachricht',
          message: `${user.username} hat dir eine private Nachricht gesendet: "${conversation.title}"`,
          link: `/messages/${conversation.id}`,
        },
      });

      return conversation;
    });

    return NextResponse.json({ success: true, conversationId: conv.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
