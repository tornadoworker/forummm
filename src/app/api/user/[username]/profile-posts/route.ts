import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    if (user.isMuted) {
      return NextResponse.json(
        { error: 'Du bist stummgeschaltet und kannst keine Profilnachrichten verfassen.' },
        { status: 403 }
      );
    }

    const { username } = await params;
    const { content } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Nachricht darf nicht leer sein.' }, { status: 400 });
    }

    const cleanContent = content.trim();
    if (cleanContent.length > 1000) {
      return NextResponse.json(
        { error: 'Die Nachricht ist zu lang (maximal 1000 Zeichen).' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { username },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden.' }, { status: 404 });
    }

    // Datenschutz-Prüfung: Erlaubt der Benutzer Pinnwandeinträge?
    if (!targetUser.allowProfilePosts && targetUser.id !== user.id) {
      return NextResponse.json(
        { error: 'Dieser Benutzer hat Pinnwandeinträge auf seinem Profil deaktiviert.' },
        { status: 403 }
      );
    }

    const message = await prisma.profileMessage.create({
      data: {
        profileUserId: targetUser.id,
        authorId: user.id,
        content: cleanContent,
      },
      include: {
        author: {
          select: { id: true, username: true, avatarUrl: true, role: true },
        },
      },
    });

    // Benachrichtigung an Profilinhaber
    if (targetUser.id !== user.id) {
      await prisma.notification.create({
        data: {
          userId: targetUser.id,
          type: 'MENTION',
          title: 'Neuer Pinnwandeintrag',
          message: `${user.username} hat eine Nachricht auf deinem Profil hinterlassen.`,
          link: `/user/${targetUser.username}`,
        },
      });
    }

    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'Nachrichten-ID erforderlich.' }, { status: 400 });
    }

    const message = await prisma.profileMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json({ error: 'Nachricht nicht gefunden.' }, { status: 404 });
    }

    // Berechtigung: Eigener Beitrag ODER Inhaber des Profils ODER Moderation/Admin
    const isAuthor = message.authorId === user.id;
    const isProfileOwner = message.profileUserId === user.id;
    const isStaff = Boolean(user.role?.canModerateForum || user.role?.canAccessAdmin);

    if (!isAuthor && !isProfileOwner && !isStaff) {
      return NextResponse.json({ error: 'Keine Berechtigung zum Löschen dieses Eintrags.' }, { status: 403 });
    }

    await prisma.profileMessage.delete({
      where: { id: messageId },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
