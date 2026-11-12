import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, signSession, setSessionCookie } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/permissions';

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canAccessAdmin(user)) {
      return NextResponse.json({ error: 'Zugriff verweigert.' }, { status: 403 });
    }

    const { userId, roleId, isBanned, banReason, username: newUsername } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'UserId fehlt.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden.' }, { status: 404 });
    }

    const isActorProjectLead = user.role.name === 'PROJEKTLEITUNG';
    const isTargetProjectLead = targetUser.role.name === 'PROJEKTLEITUNG';

    // 1. Superadmin Schutz: Projektleitung darf niemals gelöscht, gesperrt oder degradiert werden
    if (isTargetProjectLead) {
      if (isBanned === true) {
        return NextResponse.json(
          { error: 'Die Projektleitung kann nicht gesperrt werden.' },
          { status: 403 }
        );
      }
      if (roleId && roleId !== targetUser.roleId) {
        return NextResponse.json(
          { error: 'Die Projektleitung kann nicht degradiert werden.' },
          { status: 403 }
        );
      }
      if (!isActorProjectLead) {
        return NextResponse.json(
          { error: 'Nur die Projektleitung selbst kann Modifikationen an Projektleitern vornehmen.' },
          { status: 403 }
        );
      }
    }

    // 2. Strenges Hierarchie-Prinzip: Niemand darf Benutzer mit gleichem oder höherem Rang bearbeiten
    if (!isActorProjectLead && targetUser.role.priority >= user.role.priority && targetUser.id !== user.id) {
      return NextResponse.json(
        { error: 'Hierarchie-Schutz: Du kannst keine Benutzer bearbeiten, deren Rang gleich oder höher als dein eigener ist.' },
        { status: 403 }
      );
    }

    // 3. Rollenvergabe Hierarchie-Check: Man kann keine Rolle vergeben, die gleich oder höher als der eigene Rang ist
    if (roleId && roleId !== targetUser.roleId) {
      const newRole = await prisma.role.findUnique({ where: { id: roleId } });
      if (!newRole) {
        return NextResponse.json({ error: 'Ungültige Zielrolle.' }, { status: 400 });
      }

      if (!isActorProjectLead && newRole.priority >= user.role.priority) {
        return NextResponse.json(
          { error: 'Hierarchie-Schutz: Du kannst keine Rolle vergeben, die gleich oder höher als dein eigener Rang ist.' },
          { status: 403 }
        );
      }
    }

    const updateData: any = {};
    let shouldRevokeSessions = false;

    if (roleId && roleId !== targetUser.roleId) {
      updateData.roleId = roleId;
      shouldRevokeSessions = true;
    }
    if (typeof isBanned === 'boolean' && isBanned !== targetUser.isBanned) {
      updateData.isBanned = isBanned;
      updateData.banReason = isBanned ? banReason || 'Ausschluss durch Administration' : null;
      shouldRevokeSessions = true;
    }

    if (shouldRevokeSessions) {
      updateData.sessionVersion = { increment: 1 };
    }

    let usernameChanged = false;
    if (newUsername && newUsername.trim() !== targetUser.username) {
      const cleanUsername = newUsername.trim();
      if (cleanUsername.length < 3 || cleanUsername.length > 25) {
        return NextResponse.json(
          { error: 'Der Benutzername muss zwischen 3 und 25 Zeichen lang sein.' },
          { status: 400 }
        );
      }
      const existing = await prisma.user.findFirst({
        where: { username: cleanUsername, NOT: { id: userId } },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Dieser Benutzername ist bereits vergeben.' },
          { status: 400 }
        );
      }
      updateData.username = cleanUsername;
      updateData.lastUsernameChange = new Date();
      usernameChanged = true;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { role: true },
    });

    if (user.id === targetUser.id && (usernameChanged || shouldRevokeSessions)) {
      const newToken = await signSession({
        userId: user.id,
        username: updated.username,
        roleName: updated.role.name,
        sessionVersion: updated.sessionVersion,
      });
      await setSessionCookie(newToken, true);
    }

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ADMIN_USER_UPDATE',
        targetType: 'USER',
        targetId: userId,
        details: `Benutzer ${targetUser.username} aktualisiert durch ${user.username} (Rollenänderung/Sperre/Sitzungs-Invalidierung: ${shouldRevokeSessions ? 'Ja' : 'Nein'})`,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
