import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (!user.role.canModerateForum && !user.role.canAccessAdmin)) {
      return NextResponse.json({ error: 'Keine Berechtigung.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (type && type !== 'ALL') where.type = type;

    const reports = await prisma.report.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        reporter: {
          select: { id: true, username: true, avatarUrl: true, role: true },
        },
        assignedTo: {
          select: { id: true, username: true, role: true },
        },
        thread: {
          select: { id: true, title: true, author: { select: { username: true } } },
        },
        post: {
          select: { id: true, content: true, author: { select: { username: true } }, threadId: true },
        },
      },
    });

    return NextResponse.json({ reports });
  } catch (error: any) {
    console.error('Fetch reports error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Meldungen.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    if (user.isBanned) {
      return NextResponse.json({ error: 'Gesperrte Benutzer können keine Meldungen einreichen.' }, { status: 403 });
    }

    const { type, targetId, reason, description } = await req.json();

    if (!type || !targetId || !reason) {
      return NextResponse.json({ error: 'Typ, Ziel und Meldegrund sind erforderlich.' }, { status: 400 });
    }

    // Spam-Schutz: Wurde derselbe Inhalt bereits vom Benutzer gemeldet?
    const existing = await prisma.report.findFirst({
      where: {
        reporterId: user.id,
        targetId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Du hast diesen Inhalt bereits gemeldet. Unsere Moderation prüft den Fall.' },
        { status: 400 }
      );
    }

    let threadId: string | null = null;
    let postId: string | null = null;

    if (type === 'THREAD') {
      threadId = targetId;
    } else if (type === 'POST') {
      postId = targetId;
      const post = await prisma.post.findUnique({ where: { id: targetId } });
      if (post) threadId = post.threadId;
    }

    const report = await prisma.report.create({
      data: {
        type,
        targetId,
        reason,
        description: description ? description.trim() : null,
        status: 'OPEN',
        priority: 'MEDIUM',
        reporterId: user.id,
        threadId,
        postId,
      },
    });

    // Audit-Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REPORT_CREATE',
        targetType: type,
        targetId,
        details: `Meldung (${reason}) von ${user.username} eingereicht: ${description || 'Keine Beschreibung'}`,
      },
    });

    return NextResponse.json({ success: true, reportId: report.id });
  } catch (error: any) {
    console.error('Create report error:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen der Meldung.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (!user.role.canModerateForum && !user.role.canAccessAdmin)) {
      return NextResponse.json({ error: 'Keine Berechtigung.' }, { status: 403 });
    }

    const { reportId, status, assignedToId, resolutionNote } = await req.json();

    if (!reportId) {
      return NextResponse.json({ error: 'Report-ID fehlt.' }, { status: 400 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (resolutionNote !== undefined) updateData.resolutionNote = resolutionNote;
    if (status === 'RESOLVED' || status === 'REJECTED') {
      updateData.resolvedAt = new Date();
    }

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: updateData,
      include: { reporter: true },
    });

    // Benachrichtigung an den Melder senden bei Abschluss
    if (status === 'RESOLVED' || status === 'REJECTED') {
      await prisma.notification.create({
        data: {
          userId: updated.reporterId,
          type: 'REPORT_RESOLVED',
          title: status === 'RESOLVED' ? 'Meldung bearbeitet' : 'Meldung abgelehnt',
          message: `Deine Meldung zu ${updated.type} wurde durch das Moderations-Team ${status === 'RESOLVED' ? 'geprüft und gelöst' : 'abgewiesen'}.`,
          link: updated.threadId ? `/forum/thread/${updated.threadId}` : '/forum',
        },
      });
    }

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REPORT_UPDATE',
        targetType: 'REPORT',
        targetId: reportId,
        details: `Meldung #${reportId.slice(0, 8)} auf Status ${status} gesetzt durch ${user.username}`,
      },
    });

    return NextResponse.json({ success: true, report: updated });
  } catch (error: any) {
    console.error('Update report error:', error);
    return NextResponse.json({ error: 'Fehler beim Bearbeiten der Meldung.' }, { status: 500 });
  }
}
