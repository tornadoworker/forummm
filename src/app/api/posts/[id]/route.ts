import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const revalidate = 0;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const { id: postId } = await params;
    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length < 2) {
      return NextResponse.json(
        { error: 'Der Beitrag muss mindestens 2 Zeichen lang sein.' },
        { status: 400 }
      );
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        thread: true,
        author: { select: { id: true, username: true } },
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Beitrag nicht gefunden.' }, { status: 404 });
    }

    const isAuthor = post.authorId === user.id;
    const isStaff =
      Boolean(user.role?.canEditPosts) ||
      Boolean(user.role?.canModerateForum) ||
      Boolean(user.role?.canAccessAdmin) ||
      (user.role?.priority || 0) >= 30;

    if (!isAuthor && !isStaff) {
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Bearbeiten dieses Beitrags.' },
        { status: 403 }
      );
    }

    // Wenn Thread geschlossen ist und User kein Staff ist
    if (post.thread.isLocked && !isStaff) {
      return NextResponse.json(
        { error: 'Dieses Thema ist geschlossen. Beiträge können nicht mehr bearbeitet werden.' },
        { status: 403 }
      );
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        content: content.trim(),
        updatedAt: new Date(),
      },
      include: {
        author: { include: { role: true } },
        reactions: { include: { user: true } },
      },
    });

    // Audit-Log bei Moderation fremder Beiträge
    if (!isAuthor && isStaff) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'POST_EDITED_BY_STAFF',
          targetType: 'POST',
          targetId: postId,
          details: `Beitrag #${post.id} von ${post.author.username} bearbeitet.`,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, post: updatedPost });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
