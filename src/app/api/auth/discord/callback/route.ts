import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import {
  exchangeDiscordCode,
  fetchDiscordUserProfile,
  getDiscordAvatarUrl,
  verifyDiscordStateToken,
  getDiscordConfig,
  getDiscordReturnPath,
  DISCORD_STATE_COOKIE,
} from '@/lib/discord-oauth';
import { getCurrentUser, sign2FAPendingToken, signSession, COOKIE_NAME, DISCORD_2FA_COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getBaseRedirectUrl(path: string, params: Record<string, string> = {}) {
  const url = new URL(path, getDiscordConfig().appUrl);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return url;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const errorParam = searchParams.get('error');
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // 1. Hat der Nutzer auf Discord abgebrochen?
  if (errorParam) {
    const errorDesc = searchParams.get('error_description') || errorParam;
    console.warn('[Discord OAuth] Abgebrochen oder Fehler von Discord:', errorDesc);
    const dest = errorParam === 'access_denied' ? 'discord_cancelled' : 'discord_error';
    return NextResponse.redirect(getBaseRedirectUrl('/login', { error: dest }));
  }

  // 2. Code oder State fehlt
  if (!code || !state) {
    return NextResponse.redirect(getBaseRedirectUrl('/login', { error: 'discord_missing_code' }));
  }

  // 3. State-Token validieren (Schutz vor CSRF)
  const stateCookie = req.cookies.get(DISCORD_STATE_COOKIE)?.value;
  if (!stateCookie || stateCookie !== state) {
    return NextResponse.redirect(getBaseRedirectUrl('/login', { error: 'invalid_state' }));
  }

  const verifiedState = await verifyDiscordStateToken(state);
  if (!verifiedState) {
    return NextResponse.redirect(getBaseRedirectUrl('/login', { error: 'invalid_state' }));
  }

  const { isConfigured } = getDiscordConfig();
  if (!isConfigured) {
    return NextResponse.redirect(getBaseRedirectUrl('/login', { error: 'discord_not_configured' }));
  }

  // 4. Code bei Discord gegen Access-Token tauschen
  const tokenExchange = await exchangeDiscordCode(code);
  if (!tokenExchange.success || !tokenExchange.data) {
    return NextResponse.redirect(
      getBaseRedirectUrl('/login', {
        error: 'discord_token_failed',
        detail: tokenExchange.error || 'Token-Austausch fehlgeschlagen',
      })
    );
  }

  // 5. Discord-Benutzerprofil abrufen
  const profileFetch = await fetchDiscordUserProfile(tokenExchange.data.access_token);
  if (!profileFetch.success || !profileFetch.user) {
    return NextResponse.redirect(
      getBaseRedirectUrl('/login', {
        error: 'discord_profile_failed',
        detail: profileFetch.error || 'Profil konnte nicht geladen werden',
      })
    );
  }

  const discordUser = profileFetch.user;
  const discordAvatarUrl = getDiscordAvatarUrl(discordUser);

  try {
    // -------------------------------------------------------------
    // FALL A: Konto-Verknüpfung aus den Einstellungen (Action: 'link')
    // -------------------------------------------------------------
    if (verifiedState.action === 'link' && verifiedState.userId) {
      if ((await getCurrentUser())?.id !== verifiedState.userId) {
        return NextResponse.redirect(getBaseRedirectUrl('/login', { error: 'must_be_logged_in_to_link' }));
      }
      // Prüfe, ob dieser Discord-Account schon bei jemand anderem verknüpft ist
      const conflict = await prisma.user.findFirst({
        where: {
          discordId: discordUser.id,
          id: { not: verifiedState.userId },
        },
      });

      if (conflict) {
        return NextResponse.redirect(
          getBaseRedirectUrl('/settings', {
            error: 'discord_already_linked',
          })
        );
      }

      await prisma.user.update({
        where: { id: verifiedState.userId },
        data: {
          discordId: discordUser.id,
          discordTag: discordUser.username,
        },
      });

      // Stats Snapshot verknüpfen
      await prisma.playerStatsSnapshot.upsert({
        where: { stablePlayerId: `discord:${discordUser.id}` },
        update: { userId: verifiedState.userId },
        create: {
          userId: verifiedState.userId,
          stablePlayerId: `discord:${discordUser.id}`,
          playerName: discordUser.global_name || discordUser.username,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: verifiedState.userId,
          action: 'DISCORD_ACCOUNT_LINKED',
          details: `Discord Account ${discordUser.username} (${discordUser.id}) erfolgreich über OAuth2 verknüpft.`,
        },
      });

      const res = NextResponse.redirect(getBaseRedirectUrl('/settings', { success: 'discord_linked' }));
      res.cookies.delete(DISCORD_STATE_COOKIE);
      return res;
    }

    // -------------------------------------------------------------
    // FALL B: Login oder Registrierung via Discord
    // -------------------------------------------------------------
    // 1. Suche nach existierendem Nutzer anhand Discord ID
    let user = await prisma.user.findUnique({
      where: { discordId: discordUser.id },
      include: { role: true },
    });

    // Nur eine verifizierte E-Mail darf ein bisher unverknüpftes Konto zuordnen.
    if (!user && discordUser.email && discordUser.verified) {
      user = await prisma.user.findFirst({
        where: {
          discordId: null,
          email: discordUser.email.toLowerCase(),
        },
        include: { role: true },
      });

      // Wenn gefunden: Discord ID nachtragen für zukünftige blitzschnelle Logins
      if (user) {
        user = await prisma.user.update({
          where: { id: user.id, AND: { discordId: null } },
          data: {
            discordId: discordUser.id,
            discordTag: discordUser.username,
            lastActiveAt: new Date(),
          },
          include: { role: true },
        });
      }
    }

    // 3. Wenn Benutzer noch gar nicht existiert -> NEUEN ACCOUNT ERSTELLEN (Auto-Register)
    if (!user) {
      // Sauberen, einzigartigen Benutzernamen generieren
      const rawBase = (discordUser.global_name || discordUser.username || 'vega_user')
        .replace(/[^a-zA-Z0-9_]/g, '')
        .trim();
      let baseUsername = rawBase.length >= 3 ? rawBase.slice(0, 20) : `user_${discordUser.id.slice(-4)}`;

      let finalUsername = baseUsername;
      let counter = 1;
      while (await prisma.user.findUnique({ where: { username: finalUsername } })) {
        finalUsername = `${baseUsername.slice(0, 16)}_${counter}`;
        counter++;
      }

      // Standard-Rolle ermitteln
      let defaultRole = await prisma.role.findUnique({ where: { name: 'MITGLIED' } });
      if (!defaultRole) {
        defaultRole = await prisma.role.findFirst({ orderBy: { priority: 'asc' } });
      }

      if (!defaultRole) {
        return NextResponse.redirect(getBaseRedirectUrl('/login', { error: 'system_error_role' }));
      }

      const dummyPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(dummyPassword, 10);
      const email = (discordUser.email && discordUser.verified)
        ? discordUser.email.toLowerCase()
        : `${discordUser.id}@discord.vega-crimelife.de`;

      user = await prisma.user.create({
        data: {
          username: finalUsername,
          displayName: discordUser.global_name || discordUser.username,
          email,
          passwordHash,
          avatarUrl: discordAvatarUrl,
          discordId: discordUser.id,
          discordTag: discordUser.username,
          roleId: defaultRole.id,
          lastActiveAt: new Date(),
        },
        include: { role: true },
      });

      // Player Stats Snapshot erstellen
      await prisma.playerStatsSnapshot.upsert({
        where: { stablePlayerId: `discord:${discordUser.id}` },
        update: { userId: user.id },
        create: {
          userId: user.id,
          stablePlayerId: `discord:${discordUser.id}`,
          playerName: user.displayName || user.username,
        },
      });

      // Willkommens-Nachricht
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'ANNOUNCEMENT',
          title: 'Willkommen bei Vega Crimelife!',
          message: 'Dein Profil wurde erfolgreich über Discord erstellt. Willkommen im Forum!',
          link: '/wiki',
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'DISCORD_OAUTH_REGISTER',
          details: `Neuer Account via Discord OAuth2 registriert: @${user.username} (${discordUser.id})`,
        },
      });
    }

    // 4. Ist der Account gesperrt?
    if (user.isBanned) {
      return NextResponse.redirect(getBaseRedirectUrl('/login', { error: 'account_banned' }));
    }

    const target = getDiscordReturnPath(verifiedState.redirect);
    if (user.twoFactorEnabled) {
      const response = NextResponse.redirect(getBaseRedirectUrl('/login', { step: 'discord-2fa', redirect: target }));
      response.cookies.set(DISCORD_2FA_COOKIE, await sign2FAPendingToken({ userId: user.id, rememberMe: true }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 600,
      });
      response.cookies.delete(DISCORD_STATE_COOKIE);
      return response;
    }

    // 5. Sitzung ausstellen
    const sessionToken = await signSession({
      userId: user.id,
      username: user.username,
      roleName: user.role.name,
      sessionVersion: user.sessionVersion,
    });

    // 6. Erfolgreicher Redirect zum Zielort
    const response = NextResponse.redirect(getBaseRedirectUrl(target));

    // Session Cookie setzen (30 Tage)
    response.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    // State Cookie löschen
    response.cookies.delete(DISCORD_STATE_COOKIE);

    return response;
  } catch (err: any) {
    console.error('Discord OAuth Callback Exception:', err);
    return NextResponse.redirect(
      getBaseRedirectUrl('/login', {
        error: 'discord_callback_failed',
      })
    );
  }
}
