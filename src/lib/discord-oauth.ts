import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';
import { getJwtSigningKey } from './env';

export const DISCORD_STATE_COOKIE = 'cln_discord_oauth_state';

export interface DiscordOAuthState {
  action: 'login' | 'register' | 'link';
  redirect: string;
  nonce: string;
  userId?: string; // Bei 'link' die ID des eingeloggten Benutzers
  timestamp: number;
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
  email: string | null;
  verified?: boolean;
  banner?: string | null;
  accent_color?: number | null;
}

export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export function getDiscordConfig() {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const clientId = process.env.DISCORD_CLIENT_ID || '';
  const clientSecret = process.env.DISCORD_CLIENT_SECRET || '';
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${appUrl}/api/auth/discord/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
    appUrl,
    isConfigured: !!clientId && !!clientSecret && clientSecret !== 'your_discord_client_secret_here',
  };
}

export function getDiscordReturnPath(path: string): string {
  return /^\/(?![/\\])/.test(path) && !/[\\\r\n\t]/.test(path) ? path : '/';
}

/**
 * Erstellt ein signiertes State-Token zur Absicherung gegen Login-CSRF
 */
export async function createDiscordStateToken(state: Omit<DiscordOAuthState, 'timestamp'>): Promise<string> {
  const fullState: DiscordOAuthState = {
    ...state,
    timestamp: Date.now(),
  };

  return new SignJWT({ ...fullState })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(getJwtSigningKey());
}

/**
 * Validiert das State-Token
 */
export async function verifyDiscordStateToken(token: string): Promise<DiscordOAuthState | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSigningKey());
    if (!payload.action || !payload.nonce) return null;
    return payload as unknown as DiscordOAuthState;
  } catch {
    return null;
  }
}

/**
 * Generiert die Discord OAuth2 Autorisierungs-URL
 */
export function buildDiscordAuthUrl(state: string): string {
  const { clientId, redirectUri } = getDiscordConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email',
    state,
    prompt: 'consent',
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

/**
 * Tauscht den Authorization Code bei Discord gegen ein Access Token ein
 */
export async function exchangeDiscordCode(code: string): Promise<{ success: boolean; data?: DiscordTokenResponse; error?: string }> {
  const { clientId, clientSecret, redirectUri, isConfigured } = getDiscordConfig();

  if (!isConfigured) {
    return {
      success: false,
      error: 'DISCORD_CLIENT_SECRET_MISSING: Bitte trage dein Discord Client Secret in die .env Datei ein.',
    };
  }

  try {
    const bodyParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const res = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'VEGA-CrimeLife-Forum/1.0',
      },
      body: bodyParams.toString(),
    });

    const json = await res.json();
    if (!res.ok) {
      console.error('Discord Token Exchange Error:', json);
      return {
        success: false,
        error: json.error_description || json.error || 'Fehler beim Abrufen des Discord Tokens.',
      };
    }

    return {
      success: true,
      data: json as DiscordTokenResponse,
    };
  } catch (err: any) {
    console.error('Discord Token Exchange Network Error:', err);
    return {
      success: false,
      error: err.message || 'Verbindung zu Discord fehlgeschlagen.',
    };
  }
}

/**
 * Ruft die Benutzerprofildaten von Discord (@me) ab
 */
export async function fetchDiscordUserProfile(accessToken: string): Promise<{ success: boolean; user?: DiscordUser; error?: string }> {
  try {
    const res = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'VEGA-CrimeLife-Forum/1.0',
      },
    });

    const user = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: user.message || 'Discord Benutzerprofil konnte nicht abgerufen werden.',
      };
    }

    return {
      success: true,
      user: user as DiscordUser,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Netzwerkfehler beim Abrufen des Discord Profils.',
    };
  }
}

/**
 * Ermittelt die Avatar-URL des Discord-Nutzers
 */
export function getDiscordAvatarUrl(user: DiscordUser): string {
  if (user.avatar) {
    const isAnimated = user.avatar.startsWith('a_');
    const ext = isAnimated ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`;
  }
  // Fallback zu Default Discord Avataren
  const defaultIndex = user.discriminator && user.discriminator !== '0'
    ? Number(user.discriminator) % 5
    : (BigInt(user.id) >> 22n) % 6n;
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}
