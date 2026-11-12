import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { CaptchaService } from '@/lib/captcha/service';
import { CAPTCHA_SESSION_COOKIE } from '@/lib/captcha/constants';
import { getClientIp } from '@/lib/captcha/rateLimiter';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: 'Dein Konto ist gesperrt. Du kannst keine Themen verfassen.' },
        { status: 403 }
      );
    }

    if (!user.role.canCreateThreads) {
      return NextResponse.json(
        { error: 'Du hast keine Berechtigung, neue Themen zu erstellen.' },
        { status: 403 }
      );
    }

    const ip = getClientIp(req);
    const sessionId = req.cookies.get(CAPTCHA_SESSION_COOKIE)?.value || user.id;

    const {
      forumId,
      prefixId,
      title,
      content,
      pollQuestion,
      pollOptions,
      isMultiChoice,
      pollDurationDays,
      isPinned,
      isLocked,
      captchaChallengeId,
      captchaResponse,
    } = await req.json();

    // 0. Prüfen, ob CAPTCHA aufgrund auffälliger Aktivität nötig ist
    const requiresCaptcha = await CaptchaService.isCaptchaRequiredForAction('CREATE_THREAD', user.id, ip);
    if (requiresCaptcha) {
      if (!captchaChallengeId || !captchaResponse) {
        return NextResponse.json(
          {
            error: 'Aufgrund auffälliger Aktivität ist eine kurze Sicherheitsprüfung (CAPTCHA) erforderlich.',
            requiresCaptcha: true,
          },
          { status: 400 }
        );
      }

      const captchaResult = await CaptchaService.verifyCaptcha({
        challengeId: captchaChallengeId,
        response: captchaResponse,
        action: 'CREATE_THREAD',
        sessionId,
        ipAddress: ip,
      });

      if (!captchaResult.success) {
        return NextResponse.json(
          {
            error: captchaResult.message || 'Sicherheitsprüfung fehlgeschlagen.',
            requiresCaptcha: true,
          },
          { status: 400 }
        );
      }
    }

    // 1. Validierung Titel & Inhalt
    const cleanTitle = (title || '').trim();
    const cleanContent = (content || '').trim();

    if (!forumId) {
      return NextResponse.json({ error: 'Bitte wähle ein Zielforum aus.' }, { status: 400 });
    }

    if (!cleanTitle || cleanTitle.length < 3) {
      return NextResponse.json(
        { error: 'Der Thementitel muss mindestens 3 Zeichen lang sein.' },
        { status: 400 }
      );
    }

    if (cleanTitle.length > 120) {
      return NextResponse.json(
        { error: 'Der Thementitel darf maximal 120 Zeichen lang sein.' },
        { status: 400 }
      );
    }

    if (!cleanContent || cleanContent.length < 10) {
      return NextResponse.json(
        { error: 'Der Beitragsinhalt muss mindestens 10 Zeichen lang sein.' },
        { status: 400 }
      );
    }

    // 2. Forum Berechtigungsprüfung
    const targetForum = await prisma.forum.findUnique({
      where: { id: forumId },
      include: { category: true },
    });

    if (!targetForum) {
      return NextResponse.json({ error: 'Das ausgewählte Forum existiert nicht.' }, { status: 404 });
    }

    if (targetForum.isArchived || targetForum.name.toLowerCase() === 'archiv') {
      return NextResponse.json(
        { error: 'In einem Archiv-Forum können keine neuen Themen erstellt werden. Dieses Forum ist schreibgeschützt.' },
        { status: 403 }
      );
    }

    if (targetForum.isStaffOnly && !user.role.canAccessAdmin && user.role.priority < 50) {
      return NextResponse.json(
        { error: 'Dieses Forum ist ausschließlich für das Server-Team zugänglich.' },
        { status: 403 }
      );
    }

    if (user.role.priority < targetForum.minRoleToPost) {
      return NextResponse.json(
        { error: 'Dein Rang hat nicht die erforderliche Berechtigung für dieses Forum.' },
        { status: 403 }
      );
    }

    // 3. Präfix Prüfung (falls angegeben)
    let validPrefixId: string | null = null;
    if (prefixId) {
      const existingPrefix = await prisma.threadPrefix.findUnique({
        where: { id: prefixId },
      });
      if (existingPrefix) {
        validPrefixId = existingPrefix.id;
      }
    }

    // 4. Rate-Limiting / Schutz vor doppelten Beiträgen (15 Sekunden Sperre)
    const recentThread = await prisma.thread.findFirst({
      where: {
        authorId: user.id,
        createdAt: {
          gte: new Date(Date.now() - 15 * 1000),
        },
      },
    });

    if (recentThread) {
      return NextResponse.json(
        { error: 'Bitte warte mindestens 15 Sekunden, bevor du ein weiteres Thema erstellst.' },
        { status: 429 }
      );
    }

    // Berechtigung für Pin/Lock prüfen
    const canPin = user.role.canPinThreads ? Boolean(isPinned) : false;
    const canLock = user.role.canCloseThreads ? Boolean(isLocked) : false;

    // 5. Thread & Post in Transaktion erstellen
    const newThread = await prisma.$transaction(async (tx) => {
      const thread = await tx.thread.create({
        data: {
          forumId,
          prefixId: validPrefixId,
          authorId: user.id,
          title: cleanTitle,
          isPinned: canPin,
          isLocked: canLock,
          posts: {
            create: {
              authorId: user.id,
              content: cleanContent,
            },
          },
        },
      });

      // Forum Counters aktualisieren
      await tx.forum.update({
        where: { id: forumId },
        data: {
          threadsCount: { increment: 1 },
          postsCount: { increment: 1 },
          lastPostAt: new Date(),
        },
      });

      // Umfrage erstellen falls ausgefüllt
      if (
        pollQuestion &&
        pollQuestion.trim() &&
        Array.isArray(pollOptions) &&
        pollOptions.filter((o: string) => o && o.trim()).length >= 2
      ) {
        const validOptions = pollOptions
          .filter((opt: string) => opt && opt.trim().length > 0)
          .map((text: string) => text.trim());

        let expiresAt: Date | null = null;
        const durationDays = parseInt(pollDurationDays, 10);
        if (!isNaN(durationDays) && durationDays > 0) {
          expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
        }

        await tx.poll.create({
          data: {
            threadId: thread.id,
            question: pollQuestion.trim(),
            isMultiChoice: Boolean(isMultiChoice),
            expiresAt,
            options: {
              create: validOptions.map((text: string) => ({ text })),
            },
          },
        });
      }

      // Audit-Log Eintrag
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'CREATE_THREAD',
          targetType: 'THREAD',
          targetId: thread.id,
          details: `Thema "${thread.title}" in Forum "${targetForum.name}" von ${user.username} erstellt`,
        },
      });

      return thread;
    });

    // Aktion für Spamerkennung registrieren
    await CaptchaService.recordActionForSpamCheck('CREATE_THREAD', user.id, ip);

    return NextResponse.json({ success: true, threadId: newThread.id });
  } catch (err: any) {
    console.error('Create thread error:', err);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Themas. Bitte versuche es erneut.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 10, 1), 50);
    const forumId = searchParams.get('forumId');

    const threads = await prisma.thread.findMany({
      where: {
        isDeleted: false,
        ...(forumId ? { forumId } : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        forum: {
          select: {
            id: true,
            name: true,
          },
        },
        prefix: {
          select: {
            name: true,
            color: true,
          },
        },
      },
      orderBy: [
        { isPinned: 'desc' },
        { lastActivityAt: 'desc' },
      ],
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: threads,
      meta: {
        count: threads.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: err.message },
      { status: 500 }
    );
  }
}
