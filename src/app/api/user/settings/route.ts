import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, clearSessionCookie, signSession, setSessionCookie } from '@/lib/auth';
import { getUsernameCooldownInfo } from '@/lib/permissions';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // 1. KONTO LÖSCHEN
    if (action === 'DELETE_ACCOUNT') {
      const { password } = body;
      if (!password) {
        return NextResponse.json(
          { error: 'Bitte gib dein Passwort ein, um die Kontolöschung zu bestätigen.' },
          { status: 400 }
        );
      }

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return NextResponse.json(
          { error: 'Das eingegebene Passwort ist nicht korrekt.' },
          { status: 400 }
        );
      }

      // Schutz: Projektleitung kann sich nicht selbst löschen, wenn es der einzige Admin ist
      if (user.role.name === 'PROJEKTLEITUNG') {
        const adminCount = await prisma.user.count({
          where: { role: { name: 'PROJEKTLEITUNG' } },
        });
        if (adminCount <= 1) {
          return NextResponse.json(
            { error: 'Der Haupt-Projektleitungs-Account kann nicht gelöscht werden.' },
            { status: 403 }
          );
        }
      }

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_ACCOUNT_DELETED',
          details: `Benutzer ${user.username} (${user.email}) hat sein Konto gelöscht.`,
        },
      });

      // Lösche das Konto (Kaskadiert auf Lesezeichen, Reaktionen etc.)
      await prisma.user.delete({ where: { id: user.id } });
      await clearSessionCookie();

      return NextResponse.json({ success: true, message: 'Konto erfolgreich gelöscht.' });
    }

    // 2. ANDERE SITZUNGEN BEENDEN
    if (action === 'REVOKE_SESSIONS') {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { sessionVersion: { increment: 1 } },
        include: { role: true },
      });

      // Neue Sitzungskennung für dieses Gerät ausstellen, damit der aktuelle Nutzer eingeloggt bleibt
      const newToken = await signSession({
        userId: updatedUser.id,
        username: updatedUser.username,
        roleName: updatedUser.role.name,
        sessionVersion: updatedUser.sessionVersion,
      });
      await setSessionCookie(newToken, true);

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_SESSIONS_REVOKED',
          targetType: 'USER',
          targetId: user.id,
          details: `Benutzer ${user.username} hat alle anderen Sitzungen beendet (Neue Sitzungsversion: ${updatedUser.sessionVersion}).`,
        },
      });
      return NextResponse.json({
        success: true,
        message: 'Alle anderen aktiven Sitzungen auf anderen Geräten wurden erfolgreich beendet.',
      });
    }

    // 3. NORMALE EINSTELLUNGEN AKTUALISIEREN
    const updateData: any = {};

    // Profilfelder
    if (body.displayName !== undefined) updateData.displayName = body.displayName.trim() || null;
    if (body.bio !== undefined) updateData.bio = body.bio.trim() || null;
    if (body.location !== undefined) updateData.location = body.location.trim() || null;
    if (body.website !== undefined) updateData.website = body.website.trim() || null;
    if (body.discordTag !== undefined) updateData.discordTag = body.discordTag.trim() || null;
    if (body.fivemId !== undefined) updateData.fivemId = body.fivemId.trim() || null;

    // Avatar & Banner
    if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl ? body.avatarUrl.trim() : null;
    if (body.bannerUrl !== undefined) updateData.bannerUrl = body.bannerUrl ? body.bannerUrl.trim() : null;

    // Benutzername Änderung (90-Tage-Frist, ausgenommen tornadoworker & Admins)
    let usernameChanged = false;
    const oldUsername = user.username;
    if (body.newUsername && body.newUsername.trim() !== user.username) {
      const cleanUsername = body.newUsername.trim();

      // 1. Cooldown & Berechtigung prüfen
      const cooldownInfo = getUsernameCooldownInfo(user);
      if (!cooldownInfo.canChange) {
        return NextResponse.json(
          { error: cooldownInfo.reason },
          { status: 400 }
        );
      }

      // 2. Format & Länge validieren
      if (cleanUsername.length < 3 || cleanUsername.length > 25) {
        return NextResponse.json(
          { error: 'Der Benutzername muss zwischen 3 und 25 Zeichen lang sein.' },
          { status: 400 }
        );
      }

      const usernameRegex = /^[a-zA-Z0-9äöüÄÖÜß_\-. ]+$/;
      if (!usernameRegex.test(cleanUsername)) {
        return NextResponse.json(
          { error: 'Der Benutzername enthält unzulässige Sonderzeichen. Erlaubt sind Buchstaben, Ziffern, Bindestriche, Punkte und Unterstriche.' },
          { status: 400 }
        );
      }

      // 3. Sicherheits-Passwortbestätigung
      if (!body.usernamePassword) {
        return NextResponse.json(
          { error: 'Bitte gib dein aktuelles Passwort ein, um deinen Benutzernamen zu ändern.' },
          { status: 400 }
        );
      }

      const match = await bcrypt.compare(body.usernamePassword, user.passwordHash);
      if (!match) {
        return NextResponse.json(
          { error: 'Das Passwort zur Bestätigung der Namensänderung ist nicht korrekt.' },
          { status: 400 }
        );
      }

      // 4. Eindeutigkeit prüfen (case-insensitive)
      const existingUser = await prisma.user.findFirst({
        where: {
          username: cleanUsername,
          NOT: { id: user.id },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Dieser Benutzername ist bereits vergeben. Bitte wähle einen anderen.' },
          { status: 400 }
        );
      }

      updateData.username = cleanUsername;
      updateData.lastUsernameChange = new Date();
      usernameChanged = true;
    }

    // E-Mail Änderung
    if (body.newEmail && body.newEmail.trim() !== user.email) {
      const cleanEmail = body.newEmail.trim().toLowerCase();
      if (!body.emailPassword) {
        return NextResponse.json(
          { error: 'Bitte gib dein aktuelles Passwort ein, um deine E-Mail zu ändern.' },
          { status: 400 }
        );
      }
      const match = await bcrypt.compare(body.emailPassword, user.passwordHash);
      if (!match) {
        return NextResponse.json(
          { error: 'Das Passwort zur E-Mail-Bestätigung ist falsch.' },
          { status: 400 }
        );
      }
      // Prüfe ob E-Mail bereits vergeben ist
      const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (existing) {
        return NextResponse.json(
          { error: 'Diese E-Mail-Adresse wird bereits verwendet.' },
          { status: 400 }
        );
      }
      updateData.email = cleanEmail;
    }

    // Passwortänderung
    let passwordChanged = false;
    if (body.newPassword) {
      if (!body.currentPassword) {
        return NextResponse.json(
          { error: 'Bitte gib dein aktuelles Passwort ein.' },
          { status: 400 }
        );
      }
      const match = await bcrypt.compare(body.currentPassword, user.passwordHash);
      if (!match) {
        return NextResponse.json(
          { error: 'Das aktuelle Passwort ist nicht korrekt.' },
          { status: 400 }
        );
      }
      if (body.newPassword.length < 6) {
        return NextResponse.json(
          { error: 'Das neue Passwort muss mindestens 6 Zeichen lang sein.' },
          { status: 400 }
        );
      }
      if (body.newPasswordConfirm && body.newPassword !== body.newPasswordConfirm) {
        return NextResponse.json(
          { error: 'Die neuen Passwörter stimmen nicht überein.' },
          { status: 400 }
        );
      }
      updateData.passwordHash = await bcrypt.hash(body.newPassword, 12);
      updateData.lastPasswordChangeAt = new Date();
      updateData.sessionVersion = { increment: 1 };
      passwordChanged = true;
    }

    // SICHERHEITSHINWEIS: 2FA darf NICHT beliebig über dieses Einstellungs-Formular deaktiviert/geändert werden.
    // 2FA Aktivierung und Deaktivierung erfolgen ausschließlich über die gehärteten Endpunkte mit Passwortbestätigung.

    // Datenschutz
    if (body.showOnlineStatus !== undefined) updateData.showOnlineStatus = Boolean(body.showOnlineStatus);
    if (body.profilePublic !== undefined) updateData.profilePublic = Boolean(body.profilePublic);
    if (body.allowDMs !== undefined) updateData.allowDMs = Boolean(body.allowDMs);
    if (body.allowProfilePosts !== undefined) updateData.allowProfilePosts = Boolean(body.allowProfilePosts);
    if (body.showActivity !== undefined) updateData.showActivity = Boolean(body.showActivity);

    // Benachrichtigungen
    if (body.notifyReplies !== undefined) updateData.notifyReplies = Boolean(body.notifyReplies);
    if (body.notifyMentions !== undefined) updateData.notifyMentions = Boolean(body.notifyMentions);
    if (body.notifyReactions !== undefined) updateData.notifyReactions = Boolean(body.notifyReactions);
    if (body.notifyDMs !== undefined) updateData.notifyDMs = Boolean(body.notifyDMs);
    if (body.notifyTickets !== undefined) updateData.notifyTickets = Boolean(body.notifyTickets);
    if (body.notifyAnnouncements !== undefined) updateData.notifyAnnouncements = Boolean(body.notifyAnnouncements);
    if (body.notifyEmail !== undefined) updateData.notifyEmail = Boolean(body.notifyEmail);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      include: { role: true },
    });

    // Falls Benutzername oder Passwort geändert wurden: Neues Cookie mit aktueller sessionVersion ausstellen
    if (usernameChanged || passwordChanged) {
      const newToken = await signSession({
        userId: user.id,
        username: updated.username,
        roleName: user.role.name,
        sessionVersion: updated.sessionVersion,
      });
      await setSessionCookie(newToken, true);
    }

    if (usernameChanged) {
      // Spezieller Audit-Log für die Namensänderung
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_USERNAME_CHANGE',
          details: `Benutzer '${oldUsername}' hat seinen Benutzernamen in '${updated.username}' geändert. (Sonderrecht/Ausnahme: ${getUsernameCooldownInfo(user).isExempt ? 'Ja' : 'Nein'})`,
        },
      });
    }

    if (passwordChanged) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_PASSWORD_CHANGE',
          details: `Passwort geändert für ${user.username}. Alle anderen bestehenden Sitzungen wurden widerrufen.`,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_SETTINGS_UPDATE',
        details: `Benutzer ${updated.username} hat seine Kontoeinstellungen aktualisiert.`,
      },
    });

    return NextResponse.json({
      success: true,
      user: updated,
      usernameCooldown: getUsernameCooldownInfo(updated),
      message: usernameChanged
        ? `Benutzername erfolgreich in '${updated.username}' geändert.`
        : 'Einstellungen erfolgreich gespeichert.',
    });
  } catch (err: any) {
    console.error('Settings error:', err);
    return NextResponse.json({ error: err.message || 'Interner Serverfehler.' }, { status: 500 });
  }
}
