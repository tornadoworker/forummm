import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const { id: conversationId } = await params;

    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.id,
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Kein Zugriff.' }, { status: 403 });
    }

    // Gelesen Status aktualisieren
    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: new Date() },
    });

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, username: true, avatarUrl: true, role: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, username: true, avatarUrl: true, role: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ conversation });
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

    const { id: conversationId } = await params;
    const { content } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Nachricht darf nicht leer sein.' }, { status: 400 });
    }

    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.id,
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Kein Zugriff.' }, { status: 403 });
    }

    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.directMessage.create({
        data: {
          conversationId,
          senderId: user.id,
          content: content.trim(),
        },
        include: {
          sender: {
            select: { id: true, username: true, avatarUrl: true, role: true },
          },
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      // Eigenen Read-Status updaten
      await tx.conversationParticipant.update({
        where: { id: participant.id },
        data: { lastReadAt: new Date() },
      });

      // Andere Teilnehmer benachrichtigen
      const otherParticipants = await tx.conversationParticipant.findMany({
        where: {
          conversationId,
          userId: { not: user.id },
        },
      });

      for (const op of otherParticipants) {
        await tx.notification.create({
          data: {
            userId: op.userId,
            type: 'DM',
            title: 'Neue Nachricht erhalten',
            message: `${user.username} hat eine neue Nachricht geschrieben.`,
            link: `/messages/${conversationId}`,
          },
        });
      }

      return msg;
    });

    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const { messageId, content } = await req.json();

    if (!messageId || !content?.trim()) {
      return NextResponse.json({ error: 'Nachricht und Inhalt erforderlich.' }, { status: 400 });
    }

    const message = await prisma.directMessage.findUnique({
      where: { id: messageId },
    });

    if (!message || message.conversationId !== conversationId) {
      return NextResponse.json({ error: 'Nachricht nicht gefunden.' }, { status: 404 });
    }

    if (message.senderId !== user.id) {
      return NextResponse.json({ error: 'Keine Berechtigung zum Bearbeiten.' }, { status: 403 });
    }

    const updated = await prisma.directMessage.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
      },
      include: {
        sender: {
          select: { id: true, username: true, avatarUrl: true, role: true },
        },
      },
    });

    return NextResponse.json({ success: true, message: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
