import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  buildDiscordAuthUrl,
  createDiscordStateToken,
  getDiscordConfig,
  getDiscordReturnPath,
  DISCORD_STATE_COOKIE,
} from '@/lib/discord-oauth';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/discord?action=login|register|link&redirect=/path
 * Startet den echten Discord OAuth2 Flow
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const { appUrl, isConfigured } = getDiscordConfig();
    const startUrl = new URL('/api/auth/discord', appUrl);
    if (req.headers.get('host') !== startUrl.host) {
      startUrl.search = searchParams.toString();
      return NextResponse.redirect(startUrl);
    }
    if (!isConfigured) {
      return NextResponse.redirect(new URL('/login?error=discord_not_configured', appUrl));
    }
    const actionParam = searchParams.get('action') || 'login';
    const redirectParam = searchParams.get('redirect') || '/';

    const action = actionParam === 'link' || actionParam === 'register' ? actionParam : 'login';

    const currentUser = await getCurrentUser();

    // Bei "link" muss der Nutzer eingeloggt sein
    if (action === 'link' && !currentUser) {
      return NextResponse.redirect(new URL('/login?error=must_be_logged_in_to_link', appUrl));
    }

    const nonce = crypto.randomBytes(24).toString('hex');
    const stateToken = await createDiscordStateToken({
      action,
      redirect: getDiscordReturnPath(redirectParam),
      nonce,
      userId: currentUser?.id,
    });

    const discordAuthUrl = buildDiscordAuthUrl(stateToken);

    const response = NextResponse.redirect(discordAuthUrl);

    // State Token im HttpOnly Cookie sichern (10 Minuten gültig)
    response.cookies.set(DISCORD_STATE_COOKIE, stateToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10,
    });

    return response;
  } catch (err: any) {
    console.error('Error initiating Discord OAuth:', err);
    return NextResponse.redirect(new URL('/login?error=discord_init_failed', getDiscordConfig().appUrl));
  }
}
