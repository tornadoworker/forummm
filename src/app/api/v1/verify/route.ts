import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logIntegrationEvent, authenticateIntegrationKey } from '@/lib/integrations';
import { getCurrentUser } from '@/lib/auth';

export const revalidate = 0;

/**
 * GET /api/v1/verify?discordId=123456789
 * Prüft, ob ein Discord-Account bereits mit einem Foren-Account verknüpft ist.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const discordId = searchParams.get('discordId');
    const discordTag = searchParams.get('discordTag');

    if (!discordId && !discordTag) {
      return NextResponse.json({ error: 'discordId oder discordTag erforderlich.' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(discordTag ? [{ discordTag: { equals: discordTag } }] : []),
          ...(discordId ? [
            { discordTag: { equals: discordId } },
            { playerStatsSnapshot: { stablePlayerId: `discord:${discordId}` } },
          ] : []),
        ],
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            displayName: true,
            color: true,
          },
        },
        playerStatsSnapshot: true,
      },
    });

    if (!user) {
      return NextResponse.json({ linked: false });
    }

    return NextResponse.json({
      linked: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        role: user.role.displayName,
        roleColor: user.role.color,
        stats: user.playerStatsSnapshot,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

/**
 * POST /api/v1/verify
 * Verknüpft ein Discord-Konto mit einem Forum-Account.
 * Body: { username: string, discordId: string, discordTag: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, discordId, discordTag } = body;

    if (!username || !username.trim()) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Bitte gib deinen Forum-Benutzernamen an.' },
        { status: 400 }
      );
    }

    if (!discordId) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Discord-ID fehlt.' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    // Authentifizierung: Entweder über gültigen Integrations-API-Key (Bot/Server) oder durch eingeloggten Benutzer für sein eigenes Konto
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    const currentUser = await getCurrentUser();

    let isAuthorized = false;
    if (apiKey) {
      const auth = await authenticateIntegrationKey(apiKey);
      if (auth.success && (auth.integration?.name === 'DISCORD_BOT' || auth.integration?.name === 'FIVEM_SERVER')) {
        isAuthorized = true;
      }
    } else if (currentUser) {
      if (currentUser.username.toLowerCase() === cleanUsername) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Ungültiger oder fehlender API-Schlüssel für die Bot-Integration.' },
        { status: 401 }
      );
    }

    const cleanRaw = username.trim();
    const cleanLower = cleanRaw.toLowerCase();
    const cleanNoSpaces = cleanLower.replace(/\s+/g, '');

    // 1. Suche nach dem Benutzer (tolerant gegenüber Groß-/Kleinschreibung & Leerzeichen z.B. "Lucky Djamil" vs "Luckydjamil")
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: cleanRaw } },
          { username: { equals: cleanLower } },
          { displayName: { equals: cleanRaw } },
        ],
      },
      include: {
        role: true,
        playerStatsSnapshot: true,
      },
    });

    if (!user) {
      const allUsers = await prisma.user.findMany({
        include: {
          role: true,
          playerStatsSnapshot: true,
        },
      });

      user =
        allUsers.find((u) => {
          const uName = u.username.toLowerCase();
          const dName = (u.displayName || '').toLowerCase();
          const uNoSpace = uName.replace(/\s+/g, '');
          const dNoSpace = dName.replace(/\s+/g, '');

          return (
            uName === cleanLower ||
            dName === cleanLower ||
            uNoSpace === cleanNoSpaces ||
            dNoSpace === cleanNoSpaces
          );
        }) || null;
    }

    if (!user) {
      return NextResponse.json(
        {
          error: 'USER_NOT_FOUND',
          message: `Es wurde kein Forum-Konto mit dem Namen "${username}" gefunden. Bitte prüfe die Schreibweise.`,
        },
        { status: 404 }
      );
    }

    // 2. Benutzer aktualisieren mit dem Discord Tag / ID
    const savedTag = discordTag || discordId;
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        discordTag: savedTag,
        lastActiveAt: new Date(),
      },
      include: {
        role: true,
      },
    });

    // 3. PlayerStatsSnapshot verknüpfen falls vorhanden oder erstellen
    if (!user.playerStatsSnapshot) {
      await prisma.playerStatsSnapshot.upsert({
        where: { stablePlayerId: `discord:${discordId}` },
        update: {
          userId: user.id,
          playerName: user.displayName || user.username,
        },
        create: {
          userId: user.id,
          stablePlayerId: `discord:${discordId}`,
          playerName: user.displayName || user.username,
          factionName: null,
          kills: 0,
          deaths: 0,
          headshots: 0,
          playtimeMinutes: 0,
        },
      });
    }

    // 4. Audit-Log und Integration-Log schreiben
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DISCORD_ACCOUNT_LINKED',
        targetType: 'USER',
        targetId: user.id,
        details: `Discord Konto ${savedTag} (${discordId}) mit Forum-Account ${user.username} verknüpft.`,
      },
    });

    const discordConfig = await prisma.integrationConfig.findUnique({
      where: { name: 'DISCORD_BOT' },
    });
    if (discordConfig) {
      await logIntegrationEvent({
        integrationId: discordConfig.id,
        level: 'INFO',
        endpoint: '/api/v1/verify',
        method: 'POST',
        statusCode: 200,
        message: `Account verknüpft: ${user.username} <-> ${savedTag}`,
      });

      // Letzten Sync aktualisieren
      await prisma.integrationConfig.update({
        where: { id: discordConfig.id },
        data: {
          lastSyncAt: new Date(),
          status: 'CONNECTED',
          isEnabled: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Erfolgreich verknüpft!`,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        displayName: updatedUser.displayName || updatedUser.username,
        role: updatedUser.role.displayName,
        roleColor: updatedUser.role.color,
      },
    });
  } catch (err: any) {
    console.error('Verify error:', err);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: err.message },
      { status: 500 }
    );
  }
}
