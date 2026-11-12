import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (!user.role.canModerateForum && !user.role.canAccessAdmin)) {
      return NextResponse.json({ error: 'Keine Berechtigung.' }, { status: 403 });
    }

    const warnings = await prisma.warning.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true, role: true, warningPoints: true },
        },
        issuer: {
          select: { id: true, username: true, role: true },
        },
      },
    });

    return NextResponse.json({ warnings });
  } catch (error: any) {
    console.error('Fetch warnings error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Verwarnungen.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (!currentUser.role.canModerateForum && !currentUser.role.canAccessAdmin && !currentUser.role.canWarnUsers)) {
      return NextResponse.json({ error: 'Keine Berechtigung zum Verwarnen von Benutzern.' }, { status: 403 });
    }

    const { userId, reason, description, points = 1, durationDays = 30, internalNote } = await req.json();

    if (!userId || !reason) {
      return NextResponse.json({ error: 'Benutzer und Verwarnungsgrund sind erforderlich.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden.' }, { status: 404 });
    }

    // RBAC-Schutz: Moderatoren können keine gleich- oder höherrangigen Teammitglieder verwarnen
    if (targetUser.role.priority >= currentUser.role.priority && currentUser.role.name !== 'PROJEKTLEITUNG') {
      return NextResponse.json(
        { error: 'Du kannst keine gleich- oder höherrangigen Teammitglieder verwarnen.' },
        { status: 403 }
      );
    }

    const warnPoints = Math.max(1, parseInt(points, 10) || 1);
    const expiresAt = durationDays > 0 ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000) : null;

    // Verwarnung anlegen & User-Punkte aktualisieren
    const newTotalPoints = (targetUser.warningPoints || 0) + warnPoints;

    const result = await prisma.$transaction(async (tx) => {
      const warning = await tx.warning.create({
        data: {
          userId: targetUser.id,
          issuerId: currentUser.id,
          reason: reason.trim(),
          description: description ? description.trim() : null,
          points: warnPoints,
          expiresAt,
          internalNote: internalNote ? internalNote.trim() : null,
        },
      });

      // Automatische Maßnahmen bei Punkteschwellen:
      // Ab 5 Punkte: 3 Tage Schreibsperre (Mute)
      // Ab 10 Punkte: 7 Tage temporäre Kontosperre
      let autoActionDetails = '';
      const userUpdateData: any = { warningPoints: newTotalPoints };

      if (newTotalPoints >= 10 && !targetUser.isBanned) {
        const banExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        userUpdateData.isBanned = true;
        userUpdateData.banReason = `Automatische Kontosperre (Erreichen von ${newTotalPoints} Verwarnungspunkten)`;
        userUpdateData.bannedUntil = banExpiry;

        await tx.banRecord.create({
          data: {
            userId: targetUser.id,
            issuerId: currentUser.id,
            type: 'BAN',
            reason: `Automatische Sperre nach ${newTotalPoints} Verwarnungspunkten`,
            internalNote: 'Ausgelöst durch automatisches Verwarnungssystem',
            expiresAt: banExpiry,
          },
        });
        autoActionDetails = ' [Auto-Aktion: 7 Tage temporäre Kontosperre aktiviert]';
      } else if (newTotalPoints >= 5 && !targetUser.isMuted) {
        const muteExpiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        userUpdateData.isMuted = true;
        userUpdateData.mutedUntil = muteExpiry;

        await tx.banRecord.create({
          data: {
            userId: targetUser.id,
            issuerId: currentUser.id,
            type: 'MUTE',
            reason: `Automatische Schreibsperre nach ${newTotalPoints} Verwarnungspunkten`,
            internalNote: 'Ausgelöst durch automatisches Verwarnungssystem',
            expiresAt: muteExpiry,
          },
        });
        autoActionDetails = ' [Auto-Aktion: 3 Tage Schreibsperre aktiviert]';
      }

      await tx.user.update({
        where: { id: targetUser.id },
        data: userUpdateData,
      });

      // Benachrichtigung an den Benutzer (ohne interne Notiz!)
      await tx.notification.create({
        data: {
          userId: targetUser.id,
          type: 'WARNING',
          title: 'Offizielle Verwarnung erhalten',
          message: `Du hast eine Verwarnung erhalten: "${reason}" (${warnPoints} Punkte). Dein Punktestand: ${newTotalPoints}.${autoActionDetails}`,
          link: '/settings',
        },
      });

      // Moderationsprotokoll
      await tx.auditLog.create({
        data: {
          userId: currentUser.id,
          action: 'USER_WARN',
          targetType: 'USER',
          targetId: targetUser.id,
          details: `Verwarnung (${warnPoints} Pkt, Grund: "${reason}") für ${targetUser.username} durch ${currentUser.username}.${autoActionDetails}`,
        },
      });

      return warning;
    });

    return NextResponse.json({ success: true, warning: result, totalPoints: newTotalPoints });
  } catch (error: any) {
    console.error('Issue warning error:', error);
    return NextResponse.json({ error: 'Fehler beim Erteilen der Verwarnung.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (!currentUser.role.canModerateForum && !currentUser.role.canAccessAdmin)) {
      return NextResponse.json({ error: 'Keine Berechtigung zum Zurücknehmen von Verwarnungen.' }, { status: 403 });
    }

    const { warningId } = await req.json();
    if (!warningId) {
      return NextResponse.json({ error: 'Verwarnungs-ID fehlt.' }, { status: 400 });
    }

    const warning = await prisma.warning.findUnique({
      where: { id: warningId },
      include: { user: true },
    });

    if (!warning || warning.isRevoked) {
      return NextResponse.json({ error: 'Verwarnung nicht gefunden oder bereits zurückgenommen.' }, { status: 404 });
    }

    const newPoints = Math.max(0, (warning.user.warningPoints || 0) - warning.points);

    await prisma.$transaction([
      prisma.warning.update({
        where: { id: warningId },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedById: currentUser.id,
        },
      }),
      prisma.user.update({
        where: { id: warning.userId },
        data: { warningPoints: newPoints },
      }),
      prisma.notification.create({
        data: {
          userId: warning.userId,
          type: 'WARNING',
          title: 'Verwarnung zurückgenommen',
          message: `Eine Verwarnung (${warning.points} Punkte) wurde durch das Moderations-Team zurückgenommen. Neuer Punktestand: ${newPoints}.`,
          link: '/settings',
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: currentUser.id,
          action: 'USER_WARN_REVOKE',
          targetType: 'USER',
          targetId: warning.userId,
          details: `Verwarnung #${warningId.slice(0, 8)} von ${warning.user.username} zurückgenommen durch ${currentUser.username}. Neuer Stand: ${newPoints} Pkt.`,
        },
      }),
    ]);

    return NextResponse.json({ success: true, newPoints });
  } catch (error: any) {
    console.error('Revoke warning error:', error);
    return NextResponse.json({ error: 'Fehler beim Zurücknehmen der Verwarnung.' }, { status: 500 });
  }
}
