import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, setSessionCookie, signSession } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/permissions';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !canAccessAdmin(user)) {
      return NextResponse.json({ error: 'Zugriff verweigert.' }, { status: 403 });
    }

    const roles = await prisma.role.findMany({
      orderBy: { priority: 'desc' },
      include: {
        _count: { select: { users: true } },
      },
    });

    return NextResponse.json({ success: true, roles });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canAccessAdmin(user)) {
      return NextResponse.json({ error: 'Zugriff verweigert.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      displayName,
      color,
      badgeBg,
      priority,
      permissions = {},
    } = body;

    const cleanDisplayName = (displayName || '').trim();
    if (!cleanDisplayName || cleanDisplayName.length < 2) {
      return NextResponse.json(
        { error: 'Bitte gib einen gültigen Rollennamen an (mind. 2 Zeichen).' },
        { status: 400 }
      );
    }

    // System-Name generieren falls nicht angegeben
    let cleanName = (name || '').trim().toUpperCase();
    if (!cleanName) {
      cleanName = cleanDisplayName
        .toUpperCase()
        .replace(/Ä/g, 'AE')
        .replace(/Ö/g, 'OE')
        .replace(/Ü/g, 'UE')
        .replace(/ß/g, 'SS')
        .replace(/[^A-Z0-9_]/g, '_');
    }

    // Prüfen ob Rolle bereits existiert
    const existing = await prisma.role.findUnique({
      where: { name: cleanName },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Eine Rolle mit dem Systemnamen "${cleanName}" existiert bereits.` },
        { status: 400 }
      );
    }

    const parsedPriority = typeof priority === 'number' ? priority : parseInt(priority, 10) || 10;
    const finalColor = color || '#8B5CF6';
    const finalBadgeBg = badgeBg || 'rgba(139, 92, 246, 0.15)';

    const newRole = await prisma.role.create({
      data: {
        name: cleanName,
        displayName: cleanDisplayName,
        color: finalColor,
        badgeBg: finalBadgeBg,
        priority: parsedPriority,

        // Berechtigungen
        canCreateThreads: typeof permissions.canCreateThreads === 'boolean' ? permissions.canCreateThreads : true,
        canEditPosts: Boolean(permissions.canEditPosts),
        canDeletePosts: Boolean(permissions.canDeletePosts),
        canPinThreads: Boolean(permissions.canPinThreads),
        canCloseThreads: Boolean(permissions.canCloseThreads),
        canMoveThreads: Boolean(permissions.canMoveThreads),
        canManageCategories: Boolean(permissions.canManageCategories),
        canManageRoles: Boolean(permissions.canManageRoles),
        canAccessAdmin: Boolean(permissions.canAccessAdmin),
        canManageTickets: Boolean(permissions.canManageTickets),
        canViewInternalNotes: Boolean(permissions.canViewInternalNotes),
        canBanUsers: Boolean(permissions.canBanUsers),
        canWarnUsers: Boolean(permissions.canWarnUsers),
        canMuteUsers: Boolean(permissions.canMuteUsers),
        canModerateForum: Boolean(permissions.canModerateForum),
        canEditWiki: Boolean(permissions.canEditWiki),
      },
      include: {
        _count: { select: { users: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ADMIN_ROLE_CREATE',
        targetType: 'ROLE',
        targetId: newRole.id,
        details: `Neue Rolle "${newRole.displayName}" (${newRole.name}) erstellt mit Priorität ${newRole.priority}`,
      },
    });

    return NextResponse.json({ success: true, role: newRole });
  } catch (err: any) {
    console.error('Role creation error:', err);
    return NextResponse.json({ error: err.message || 'Fehler beim Erstellen der Rolle.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canAccessAdmin(user)) {
      return NextResponse.json({ error: 'Zugriff verweigert.' }, { status: 403 });
    }

    const { roleId, permissions, displayName, color, badgeBg, priority } = await req.json();

    if (!roleId) {
      return NextResponse.json({ error: 'RoleId fehlt.' }, { status: 400 });
    }

    const targetRole = await prisma.role.findUnique({ where: { id: roleId } });
    if (!targetRole) {
      return NextResponse.json({ error: 'Rolle nicht gefunden.' }, { status: 404 });
    }

    // Schutz: Projektleitung muss immer canAccessAdmin behalten
    if (targetRole.name === 'PROJEKTLEITUNG' && permissions?.canAccessAdmin === false) {
      return NextResponse.json(
        { error: 'Die Projektleitung muss dauerhaften Administratorzugriff behalten.' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (displayName !== undefined && displayName.trim()) updateData.displayName = displayName.trim();
    if (color !== undefined) updateData.color = color;
    if (badgeBg !== undefined) updateData.badgeBg = badgeBg;
    if (priority !== undefined) {
      const p = typeof priority === 'number' ? priority : parseInt(priority, 10);
      if (!isNaN(p)) updateData.priority = p;
    }

    if (permissions) {
      if (typeof permissions.canCreateThreads === 'boolean') updateData.canCreateThreads = permissions.canCreateThreads;
      if (typeof permissions.canEditPosts === 'boolean') updateData.canEditPosts = permissions.canEditPosts;
      if (typeof permissions.canDeletePosts === 'boolean') updateData.canDeletePosts = permissions.canDeletePosts;
      if (typeof permissions.canPinThreads === 'boolean') updateData.canPinThreads = permissions.canPinThreads;
      if (typeof permissions.canCloseThreads === 'boolean') updateData.canCloseThreads = permissions.canCloseThreads;
      if (typeof permissions.canMoveThreads === 'boolean') updateData.canMoveThreads = permissions.canMoveThreads;
      if (typeof permissions.canManageCategories === 'boolean') updateData.canManageCategories = permissions.canManageCategories;
      if (typeof permissions.canManageRoles === 'boolean') updateData.canManageRoles = permissions.canManageRoles;
      if (typeof permissions.canAccessAdmin === 'boolean') updateData.canAccessAdmin = permissions.canAccessAdmin;
      if (typeof permissions.canManageTickets === 'boolean') updateData.canManageTickets = permissions.canManageTickets;
      if (typeof permissions.canViewInternalNotes === 'boolean') updateData.canViewInternalNotes = permissions.canViewInternalNotes;
      if (typeof permissions.canBanUsers === 'boolean') updateData.canBanUsers = permissions.canBanUsers;
      if (typeof permissions.canWarnUsers === 'boolean') updateData.canWarnUsers = permissions.canWarnUsers;
      if (typeof permissions.canMuteUsers === 'boolean') updateData.canMuteUsers = permissions.canMuteUsers;
      if (typeof permissions.canModerateForum === 'boolean') updateData.canModerateForum = permissions.canModerateForum;
      if (typeof permissions.canEditWiki === 'boolean') updateData.canEditWiki = permissions.canEditWiki;
    }

    const updated = await prisma.role.update({
      where: { id: roleId },
      data: updateData,
      include: {
        _count: { select: { users: true } },
      },
    });

    // Falls Berechtigungen modifiziert wurden: Alle Sitzungen betroffener Benutzer invalidieren
    if (permissions) {
      await prisma.user.updateMany({
        where: { roleId },
        data: { sessionVersion: { increment: 1 } },
      });

      // Falls die eigene Rolle modifiziert wurde: Eigenes Cookie auffrischen
      if (user.roleId === roleId) {
        const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (freshUser) {
          const newToken = await signSession({
            userId: user.id,
            username: user.username,
            roleName: updated.name,
            sessionVersion: freshUser.sessionVersion,
          });
          await setSessionCookie(newToken, true);
        }
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ADMIN_ROLE_UPDATE',
        targetType: 'ROLE',
        targetId: roleId,
        details: `Rolle ${targetRole.name} aktualisiert durch ${user.username} (Sitzungen invalidiert: ${permissions ? 'Ja' : 'Nein'})`,
      },
    });

    return NextResponse.json({ success: true, role: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canAccessAdmin(user)) {
      return NextResponse.json({ error: 'Zugriff verweigert.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get('id');

    if (!roleId) {
      return NextResponse.json({ error: 'Rollen-ID erforderlich.' }, { status: 400 });
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      return NextResponse.json({ error: 'Rolle nicht gefunden.' }, { status: 404 });
    }

    // System-Rollen vor Löschung schützen
    const systemRoles = ['PROJEKTLEITUNG', 'ADMINISTRATOR', 'MITGLIED', 'GAST', 'USER'];
    if (systemRoles.includes(role.name) || role.priority >= 100) {
      return NextResponse.json(
        { error: `Die System-Rolle "${role.displayName}" kann nicht gelöscht werden.` },
        { status: 400 }
      );
    }

    // Falls noch Benutzer diese Rolle haben, auf Standard-Mitglied umschichten
    if (role._count.users > 0) {
      const defaultUserRole = await prisma.role.findFirst({
        where: { OR: [{ name: 'MITGLIED' }, { name: 'USER' }] },
      });
      if (defaultUserRole) {
        await prisma.user.updateMany({
          where: { roleId: role.id },
          data: {
            roleId: defaultUserRole.id,
            sessionVersion: { increment: 1 },
          },
        });
      }
    }

    await prisma.role.delete({ where: { id: roleId } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ADMIN_ROLE_DELETE',
        targetType: 'ROLE',
        targetId: roleId,
        details: `Rolle "${role.displayName}" (${role.name}) gelöscht durch ${user.username}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
