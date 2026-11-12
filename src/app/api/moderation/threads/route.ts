import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (!user.role.canModerateForum && !user.role.canAccessAdmin)) {
      return NextResponse.json({ error: 'Keine Moderationsberechtigung.' }, { status: 403 });
    }

    const { threadId, action, targetForumId, prefixId, reason } = await req.json();

    if (!threadId || !action) {
      return NextResponse.json({ error: 'Thema und Aktion erforderlich.' }, { status: 400 });
    }

    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
      include: { forum: true, author: true },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thema nicht gefunden.' }, { status: 404 });
    }

    const updateData: any = {};
    let logAction = '';
    let details = '';

    switch (action) {
      case 'PIN':
        updateData.isPinned = true;
        logAction = 'THREAD_PIN';
        details = `Thema "${thread.title}" angepinnt`;
        break;
      case 'UNPIN':
        updateData.isPinned = false;
        logAction = 'THREAD_UNPIN';
        details = `Thema "${thread.title}" entpinnt`;
        break;
      case 'LOCK':
        updateData.isLocked = true;
        logAction = 'THREAD_LOCK';
        details = `Thema "${thread.title}" geschlossen (Grund: ${reason || 'Keine Angabe'})`;
        break;
      case 'UNLOCK':
        updateData.isLocked = false;
        logAction = 'THREAD_UNLOCK';
        details = `Thema "${thread.title}" wiedereröffnet`;
        break;
      case 'MOVE':
        if (!targetForumId) {
          return NextResponse.json({ error: 'Zielforum fehlt.' }, { status: 400 });
        }
        updateData.forumId = targetForumId;
        logAction = 'THREAD_MOVE';
        details = `Thema "${thread.title}" von Forum "${thread.forum.name}" verschoben`;
        break;
      case 'DELETE':
        updateData.isDeleted = true;
        updateData.deletedAt = new Date();
        updateData.deletedById = user.id;
        logAction = 'THREAD_SOFT_DELETE';
        details = `Thema "${thread.title}" gelöscht (Grund: ${reason || 'Keine Angabe'})`;
        break;
      case 'RESTORE':
        updateData.isDeleted = false;
        updateData.deletedAt = null;
        updateData.deletedById = null;
        logAction = 'THREAD_RESTORE';
        details = `Thema "${thread.title}" wiederhergestellt`;
        break;
      case 'REJECT_AND_ARCHIVE': {
        const rejectedPrefix = await prisma.threadPrefix.findFirst({
          where: { OR: [{ name: 'Abgelehnt' }, { name: 'Rejected' }] },
        });

        // Passendes Unterforen-Archiv ermitteln
        let archiveForum: any = null;
        if (thread.forum?.isArchived || thread.forum?.name?.toLowerCase() === 'archiv') {
          archiveForum = thread.forum;
        } else {
          // 1. Direktes Kind-Archiv dieses Unterforums
          archiveForum = await prisma.forum.findFirst({
            where: {
              parentId: thread.forumId,
              isArchived: true,
            },
          });

          // 2. Falls das Thema im übergeordneten Forum lag, Geschwister-Archiv oder Parent-Archiv suchen
          if (!archiveForum && thread.forum?.parentId) {
            archiveForum = await prisma.forum.findFirst({
              where: {
                parentId: thread.forum.parentId,
                isArchived: true,
              },
            });
          }

          // 3. Fallback: beliebiges Archiv
          if (!archiveForum) {
            archiveForum = await prisma.forum.findFirst({
              where: { isArchived: true },
            });
          }
        }

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

        logAction = 'THREAD_REJECT_AND_ARCHIVE';
        details = `Thema "${thread.title}" wurde abgelehnt, geschlossen und in das Archiv verschoben.`;

        if (thread.authorId !== user.id) {
          await prisma.notification.create({
            data: {
              userId: thread.authorId,
              type: 'THREAD_REJECTED',
              title: 'Thema abgelehnt & archiviert',
              message: `Dein Thema "${thread.title}" wurde abgelehnt, geschlossen und in das Archiv verschoben.`,
              link: `/forum/thread/${thread.id}`,
            },
          });
        }
        break;
      }
      case 'CHANGE_PREFIX': {
        if (prefixId) {
          const targetPrefix = await prisma.threadPrefix.findUnique({ where: { id: prefixId } });
          if (!targetPrefix) {
            return NextResponse.json({ error: 'Präfix nicht gefunden.' }, { status: 404 });
          }

          // Falls "Abgelehnt" gewählt wurde -> automatisches Verschieben ins Archiv & Sperren!
          if (targetPrefix.name.toLowerCase() === 'abgelehnt' || targetPrefix.name.toLowerCase() === 'rejected') {
            let archiveForum = await prisma.forum.findFirst({
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

            updateData.isLocked = true;
            updateData.prefixId = targetPrefix.id;

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

            logAction = 'THREAD_REJECT_AND_ARCHIVE';
            details = `Thema "${thread.title}" abgelehnt, geschlossen und in das Archiv verschoben`;

            if (thread.authorId !== user.id) {
              await prisma.notification.create({
                data: {
                  userId: thread.authorId,
                  type: 'THREAD_REJECTED',
                  title: 'Thema abgelehnt & archiviert',
                  message: `Dein Thema "${thread.title}" wurde abgelehnt, geschlossen und in das Archiv verschoben.`,
                  link: `/forum/thread/${thread.id}`,
                },
              });
            }
          } else {
            updateData.prefixId = targetPrefix.id;
            logAction = 'THREAD_PREFIX_CHANGE';
            details = `Präfix von Thema "${thread.title}" auf "${targetPrefix.name}" geändert`;
          }
        } else {
          updateData.prefixId = null;
          logAction = 'THREAD_PREFIX_REMOVE';
          details = `Präfix von Thema "${thread.title}" entfernt`;
        }
        break;
      }
      default:
        return NextResponse.json({ error: 'Unbekannte Aktion.' }, { status: 400 });
    }

    const updated = await prisma.thread.update({
      where: { id: threadId },
      data: updateData,
      include: {
        prefix: true,
        forum: true,
      },
    });

    // Audit-Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: logAction,
        targetType: 'THREAD',
        targetId: threadId,
        details: `${details} von ${user.username}`,
      },
    });

    return NextResponse.json({ success: true, thread: updated });
  } catch (error: any) {
    console.error('Thread moderation error:', error);
    return NextResponse.json({ error: 'Fehler bei der Themen-Moderation.' }, { status: 500 });
  }
}
