import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (!user.role.canModerateForum && !user.role.canAccessAdmin && !user.role.canDeletePosts && !user.role.canEditPosts)) {
      return NextResponse.json({ error: 'Keine Moderationsberechtigung.' }, { status: 403 });
    }

    const { postId, action, content, reason } = await req.json();

    if (!postId || !action) {
      return NextResponse.json({ error: 'Beitrag und Aktion erforderlich.' }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { author: true, thread: true },
    });

    if (!post) {
      return NextResponse.json({ error: 'Beitrag nicht gefunden.' }, { status: 404 });
    }

    const updateData: any = {};
    let logAction = '';
    let details = '';

    switch (action) {
      case 'DELETE':
        updateData.isDeleted = true;
        updateData.deletedAt = new Date();
        updateData.deletedById = user.id;
        logAction = 'POST_SOFT_DELETE';
        details = `Beitrag #${post.id.slice(0, 8)} in "${post.thread.title}" gelöscht (Grund: ${reason || 'Keine Angabe'})`;
        break;
      case 'RESTORE':
        updateData.isDeleted = false;
        updateData.deletedAt = null;
        updateData.deletedById = null;
        logAction = 'POST_RESTORE';
        details = `Beitrag #${post.id.slice(0, 8)} in "${post.thread.title}" wiederhergestellt`;
        break;
      case 'EDIT':
        if (!content || !content.trim()) {
          return NextResponse.json({ error: 'Inhalt darf nicht leer sein.' }, { status: 400 });
        }
        updateData.content = content.trim();
        updateData.isEdited = true;
        updateData.editedAt = new Date();
        logAction = 'POST_MOD_EDIT';
        details = `Beitrag #${post.id.slice(0, 8)} in "${post.thread.title}" durch Moderator bearbeitet (Grund: ${reason || 'Keine Angabe'})`;
        break;
      default:
        return NextResponse.json({ error: 'Unbekannte Aktion.' }, { status: 400 });
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: updateData,
    });

    // Benachrichtigung an Autor falls gelöscht
    if (action === 'DELETE' && post.authorId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          type: 'POST_REMOVED',
          title: 'Beitrag moderiert',
          message: `Dein Beitrag im Thema "${post.thread.title}" wurde durch die Moderation entfernt. Grund: "${reason || 'Verstoß gegen die Forenregeln'}".`,
          link: `/forum/thread/${post.threadId}`,
        },
      });
    }

    // Audit-Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: logAction,
        targetType: 'POST',
        targetId: postId,
        details: `${details} von ${user.username}`,
      },
    });

    return NextResponse.json({ success: true, post: updated });
  } catch (error: any) {
    console.error('Post moderation error:', error);
    return NextResponse.json({ error: 'Fehler bei der Beitrags-Moderation.' }, { status: 500 });
  }
}
