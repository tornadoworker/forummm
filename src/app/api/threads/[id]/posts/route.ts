import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { CaptchaService } from '@/lib/captcha/service';
import { CAPTCHA_SESSION_COOKIE } from '@/lib/captcha/constants';
import { getClientIp } from '@/lib/captcha/rateLimiter';

export async function POST(
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
    const { content, captchaChallengeId, captchaResponse } = body;

    const ip = getClientIp(req);
    const sessionId = req.cookies.get(CAPTCHA_SESSION_COOKIE)?.value || user.id;

    // Prüfen ob CAPTCHA aufgrund auffälliger Aktivität nötig ist
    const requiresCaptcha = await CaptchaService.isCaptchaRequiredForAction('CREATE_POST', user.id, ip);
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
        action: 'CREATE_POST',
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

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Beitrag darf nicht leer sein.' }, { status: 400 });
    }

    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
      include: { forum: true, author: true },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thema nicht gefunden.' }, { status: 404 });
    }

    if (thread.forum?.isArchived || thread.forum?.name?.toLowerCase() === 'archiv') {
      return NextResponse.json(
        { error: 'Dieses Thema befindet sich im Archiv und ist dauerhaft schreibgeschützt. Niemand kann hier Beiträge verfassen.' },
        { status: 403 }
      );
    }

    if (thread.isLocked) {
      return NextResponse.json(
        { error: 'Dieses Thema ist geschlossen. Es können keine neuen Antworten verfasst werden.' },
        { status: 403 }
      );
    }

    const newPost = await prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          threadId,
          authorId: user.id,
          content: content.trim(),
        },
        include: {
          author: { include: { role: true } },
        },
      });

      await tx.thread.update({
        where: { id: threadId },
        data: {
          repliesCount: { increment: 1 },
          lastActivityAt: new Date(),
        },
      });

      await tx.forum.update({
        where: { id: thread.forumId },
        data: {
          postsCount: { increment: 1 },
          lastPostAt: new Date(),
        },
      });

      // Benachrichtigung an den Thread-Ersteller (falls nicht der gleiche User)
      if (thread.authorId !== user.id) {
        await tx.notification.create({
          data: {
            userId: thread.authorId,
            type: 'REPLY',
            title: 'Neue Antwort auf dein Thema',
            message: `${user.username} hat auf dein Thema "${thread.title}" geantwortet.`,
            link: `/forum/thread/${thread.id}#post-${post.id}`,
          },
        });
      }

      return post;
    });

    // Aktion für Spamerkennung registrieren
    await CaptchaService.recordActionForSpamCheck('CREATE_POST', user.id, ip);

    return NextResponse.json({ success: true, post: newPost });
  } catch (err: any) {
    console.error('Create post error:', err);
    return NextResponse.json({ error: 'Fehler beim Speichern der Antwort.' }, { status: 500 });
  }
}
