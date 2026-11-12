import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (!user.role.canModerateForum && !user.role.canAccessAdmin && !user.role.canBanUsers)) {
      return NextResponse.json({ error: 'Keine Berechtigung.' }, { status: 403 });
    }

    const bans = await prisma.banRecord.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true, role: true, isBanned: true, isMuted: true },
        },
        issuer: {
          select: { id: true, username: true, role: true },
        },
      },
    });

    return NextResponse.json({ bans });
  } catch (error: any) {
    console.error('Fetch bans error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Sperren.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (!currentUser.role.canModerateForum && !currentUser.role.canAccessAdmin && !currentUser.role.canBanUsers)) {
      return NextResponse.json({ error: 'Keine Berechtigung zum Verhängen von Sperren.' }, { status: 403 });
    }

    const { userId, type = 'BAN', reason, durationDays = 0, internalNote } = await req.json();

    if (!userId || !reason) {
      return NextResponse.json({ error: 'Benutzer und Sperrgrund sind erforderlich.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden.' }, { status: 404 });
    }

    // RBAC-Schutz: Moderatoren können keine gleich- oder höherrangigen Teammitglieder sperren
    if (targetUser.role.priority >= currentUser.role.priority && currentUser.role.name !== 'PROJEKTLEITUNG') {
      return NextResponse.json(
        { error: 'Du kannst keine gleich- oder höherrangigen Teammitglieder sperren.' },
        { status: 403 }
      );
    }

    // Aussperrschutz: Das letzte aktive Administratorkonto kann niemals gesperrt werden
    if (targetUser.role.name === 'PROJEKTLEITUNG' && type === 'BAN') {
      const activeAdminCount = await prisma.user.count({
        where: { role: { name: 'PROJEKTLEITUNG' }, isBanned: false },
      });
      if (activeAdminCount <= 1) {
        return NextResponse.json(
          { error: 'Aussperrschutz: Das letzte aktive Administratorkonto kann nicht gesperrt werden.' },
          { status: 403 }
        );
      }
    }

    const days = parseInt(durationDays, 10) || 0;
    const expiresAt = days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
    const isPermanent = days === 0;

    const userUpdate: any = {
      sessionVersion: { increment: 1 },
    };
    if (type === 'MUTE') {
      userUpdate.isMuted = true;
      userUpdate.mutedUntil = expiresAt;
    } else {
      userUpdate.isBanned = true;
      userUpdate.banReason = reason.trim();
      userUpdate.bannedUntil = expiresAt;
    }

    const result = await prisma.$transaction(async (tx) => {
      const banRecord = await tx.banRecord.create({
        data: {
          userId: targetUser.id,
          issuerId: currentUser.id,
          type,
          reason: reason.trim(),
          internalNote: internalNote ? internalNote.trim() : null,
          expiresAt,
          isActive: true,
        },
      });

      await tx.user.update({
        where: { id: targetUser.id },
        data: userUpdate,
      });

      // Benachrichtigung
      await tx.notification.create({
        data: {
          userId: targetUser.id,
          type: type === 'MUTE' ? 'MUTE' : 'BAN',
          title: type === 'MUTE' ? 'Schreibsperre verhängt' : 'Kontosperre verhängt',
          message: `Gegen dein Konto wurde eine ${type === 'MUTE' ? 'Schreibsperre' : 'Kontosperre'} verhängt. Grund: "${reason}". Dauer: ${isPermanent ? 'Permanent' : `${days} Tage`}.`,
          link: '/rules',
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: currentUser.id,
          action: type === 'MUTE' ? 'USER_MUTE' : 'USER_BAN',
          targetType: 'USER',
          targetId: targetUser.id,
          details: `${type === 'MUTE' ? 'Schreibsperre' : 'Sperre'} (${isPermanent ? 'Permanent' : `${days} Tage`}, Grund: "${reason}") für ${targetUser.username} durch ${currentUser.username}`,
        },
      });

      return banRecord;
    });

    return NextResponse.json({ success: true, banRecord: result });
  } catch (error: any) {
    console.error('Create ban error:', error);
    return NextResponse.json({ error: 'Fehler beim Verhängen der Sperre.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (!currentUser.role.canModerateForum && !currentUser.role.canAccessAdmin && !currentUser.role.canBanUsers)) {
      return NextResponse.json({ error: 'Keine Berechtigung zum Aufheben von Sperren.' }, { status: 403 });
    }

    const { userId, type = 'BAN', revocationNote } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Benutzer-ID fehlt.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden.' }, { status: 404 });
    }

    const userUpdate: any = {};
    if (type === 'MUTE') {
      userUpdate.isMuted = false;
      userUpdate.mutedUntil = null;
    } else {
      userUpdate.isBanned = false;
      userUpdate.banReason = null;
      userUpdate.bannedUntil = null;
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: userUpdate,
      }),
      prisma.banRecord.updateMany({
        where: { userId, type, isActive: true },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedById: currentUser.id,
          revocationNote: revocationNote || 'Aufgehoben durch Moderation',
        },
      }),
      prisma.notification.create({
        data: {
          userId,
          type: 'BAN_REVOKED',
          title: type === 'MUTE' ? 'Schreibsperre aufgehoben' : 'Kontosperre aufgehoben',
          message: `Deine ${type === 'MUTE' ? 'Schreibsperre' : 'Kontosperre'} wurde durch das Server-Team aufgehoben.`,
          link: '/forum',
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: currentUser.id,
          action: type === 'MUTE' ? 'USER_MUTE_REVOKE' : 'USER_UNBAN',
          targetType: 'USER',
          targetId: userId,
          details: `${type === 'MUTE' ? 'Schreibsperre' : 'Kontosperre'} für ${targetUser.username} aufgehoben durch ${currentUser.username}`,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Revoke ban error:', error);
    return NextResponse.json({ error: 'Fehler beim Aufheben der Sperre.' }, { status: 500 });
  }
}
