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

    const { id: postId } = await params;
    const { type = 'LIKE' } = await req.json();

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { thread: true },
    });

    if (!post) {
      return NextResponse.json({ error: 'Beitrag nicht gefunden.' }, { status: 404 });
    }

    // Prüfen ob Reaktion bereits existiert
    const existing = await prisma.reaction.findUnique({
      where: {
        postId_userId_type: {
          postId,
          userId: user.id,
          type,
        },
      },
    });

    if (existing) {
      // Entfernen (Toggle)
      await prisma.reaction.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ success: true, reacted: false });
    } else {
      // Hinzufügen
      await prisma.reaction.create({
        data: {
          postId,
          userId: user.id,
          type,
        },
      });

      // Notification falls nicht eigener Post
      if (post.authorId !== user.id) {
        await prisma.notification.create({
          data: {
            userId: post.authorId,
            type: 'REACTION',
            title: 'Neue Reaktion auf deinen Beitrag',
            message: `${user.username} hat mit "${type}" auf deinen Beitrag reagiert.`,
            link: `/forum/thread/${post.threadId}#post-${post.id}`,
          },
        });
      }

      return NextResponse.json({ success: true, reacted: true });
    }
  } catch (err: any) {
    console.error('Reaction error:', err);
    return NextResponse.json({ error: 'Fehler bei der Reaktion.' }, { status: 500 });
  }
}
