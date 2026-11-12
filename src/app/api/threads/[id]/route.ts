import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const { id: threadId } = await params;
    const body = await req.json();

    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
      include: { forum: true },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thema nicht gefunden.' }, { status: 404 });
    }

    const updateData: any = {};

    // Prüfen ob Präfix auf "Abgelehnt" geändert wird oder Direktaktion
    let isRejectAction = body.action === 'REJECT_AND_ARCHIVE';
    if (body.prefixId !== undefined) {
      if (body.prefixId) {
        const pfx = await prisma.threadPrefix.findUnique({ where: { id: body.prefixId } });
        if (pfx && (pfx.name.toLowerCase() === 'abgelehnt' || pfx.name.toLowerCase() === 'rejected')) {
          isRejectAction = true;
        }
        updateData.prefixId = body.prefixId;
      } else {
        updateData.prefixId = null;
      }
    }

    // Wenn abgelehnt wird: Thema sperren und ins Kind-Archiv des Subforums verschieben!
    if (isRejectAction) {
      const canModerate =
        user.role.canCloseThreads ||
        user.role.canModerateForum ||
        user.role.canAccessAdmin ||
        user.role.priority >= 30;

      if (!canModerate) {
        return NextResponse.json({ error: 'Keine Berechtigung zum Ablehnen & Archivieren.' }, { status: 403 });
      }

      let archiveForum: any = null;
      if (thread.forum?.isArchived || thread.forum?.name?.toLowerCase() === 'archiv') {
        archiveForum = thread.forum;
      } else {
        archiveForum = await prisma.forum.findFirst({
          where: { parentId: thread.forumId, isArchived: true },
        });
        if (!archiveForum && thread.forum?.parentId) {
          archiveForum = await prisma.forum.findFirst({
            where: { parentId: thread.forum.parentId, isArchived: true },
          });
        }
        if (!archiveForum) {
          archiveForum = await prisma.forum.findFirst({ where: { isArchived: true } });
        }
      }

      const rejectedPrefix = await prisma.threadPrefix.findFirst({
        where: { OR: [{ name: 'Abgelehnt' }, { name: 'Rejected' }] },
      });

      updateData.isLocked = true;
      if (rejectedPrefix) {
        updateData.prefixId = rejectedPrefix.id;
      }

      if (archiveForum && archiveForum.id !== thread.forumId) {
        updateData.forumId = archiveForum.id;
        await prisma.forum.update({
          where: { id: thread.forumId },
          data: { threadsCount: { decrement: 1 } },
        });
        await prisma.forum.update({
          where: { id: archiveForum.id },
          data: { threadsCount: { increment: 1 } },
        });
      }
    }

    // Pinnen
    if (typeof body.isPinned === 'boolean') {
      if (!user.role.canPinThreads) {
        return NextResponse.json({ error: 'Keine Berechtigung zum Pinnen.' }, { status: 403 });
      }
      updateData.isPinned = body.isPinned;
    }

    // Schließen
    if (typeof body.isLocked === 'boolean' && !isRejectAction) {
      if (!user.role.canCloseThreads) {
        return NextResponse.json({ error: 'Keine Berechtigung zum Schließen.' }, { status: 403 });
      }
      updateData.isLocked = body.isLocked;
    }

    // Verschieben
    if (body.forumId && !isRejectAction) {
      if (!user.role.canMoveThreads) {
        return NextResponse.json({ error: 'Keine Berechtigung zum Verschieben.' }, { status: 403 });
      }
      updateData.forumId = body.forumId;
    }

    const updated = await prisma.thread.update({
      where: { id: threadId },
      data: updateData,
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'THREAD_MODERATE',
        targetType: 'THREAD',
        targetId: threadId,
        details: `Moderation an Thema ${threadId}: ${JSON.stringify(updateData)}`,
      },
    });

    return NextResponse.json({ success: true, thread: updated });
  } catch (err: any) {
    console.error('Thread patch error:', err);
    return NextResponse.json({ error: 'Fehler bei der Moderation.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const { id: threadId } = await params;

    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thema nicht gefunden.' }, { status: 404 });
    }

    // Löschberechtigung: Entweder canDeletePosts oder eigener Thread
    const canDelete = user.role.canDeletePosts || thread.authorId === user.id;
    if (!canDelete) {
      return NextResponse.json({ error: 'Keine Berechtigung zum Löschen.' }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.thread.delete({ where: { id: threadId } });
      await tx.forum.update({
        where: { id: thread.forumId },
        data: {
          threadsCount: { decrement: 1 },
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'THREAD_DELETE',
          targetType: 'THREAD',
          targetId: threadId,
          details: `Thema "${thread.title}" wurde gelöscht`,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Thread delete error:', err);
    return NextResponse.json({ error: 'Fehler beim Löschen des Themas.' }, { status: 500 });
  }
}
