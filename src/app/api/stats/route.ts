import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sortPlayerRankings, rankPlayerFactions } from '@/lib/rankings';

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all'; // all | month | week | today
    const query = (searchParams.get('q') || '').trim().toLowerCase();
    const mode = searchParams.get('mode') || 'players'; // players | factions
    const devMode = searchParams.get('dev') === 'true' || searchParams.get('demo') === 'true';

    // 1. Prüfen ob Datenquelle aktiv ist
    const fivemConfig = await prisma.integrationConfig.findUnique({
      where: { name: 'FIVEM_SERVER' },
    });

    const isConnected = Boolean(fivemConfig?.isEnabled && fivemConfig?.status === 'CONNECTED');
    const lastSyncAt = fivemConfig?.lastSyncAt || null;

    // 2. Echtdaten abfragen
    const rawSnapshots = await prisma.playerStatsSnapshot.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            role: { select: { displayName: true, color: true } },
          },
        },
      },
      orderBy: [{ kills: 'desc' }, { headshots: 'desc' }],
    });

    // Wenn keine Verbindung und keine echten Snapshots vorhanden sind
    if (!isConnected && rawSnapshots.length === 0 && !devMode) {
      return NextResponse.json({
        connected: false,
        sourceStatus: 'NOT_CONNECTED',
        statusMessage: 'Noch keine Datenquelle verbunden',
        lastUpdated: null,
        rankings: [],
        topShooter: null,
        factions: [],
        devMode: false,
      });
    }

    // Wenn Dev-Modus explizit aktiviert wurde und keine Daten da sind:
    let playerList = rawSnapshots;
    if (rawSnapshots.length === 0 && devMode) {
      playerList = [
        {
          id: 'demo-1',
          stablePlayerId: 'demo:shooter1',
          playerName: 'Tornado_Sniper',
          factionName: 'East Side Ballas',
          kills: 342,
          deaths: 89,
          headshots: 198,
          playtimeMinutes: 4200,
          wins: 28,
          losses: 4,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
          userId: null,
          user: {
            id: 'demo-user-1',
            username: 'Tornado_Sniper',
            avatarUrl: null,
            role: { displayName: 'V.I.P.', color: '#8B5CF6' },
          },
        },
        {
          id: 'demo-2',
          stablePlayerId: 'demo:shooter2',
          playerName: 'Vega_Demon',
          factionName: 'Bloods',
          kills: 298,
          deaths: 112,
          headshots: 145,
          playtimeMinutes: 3800,
          wins: 22,
          losses: 7,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
          userId: null,
          user: {
            id: 'demo-user-2',
            username: 'Vega_Demon',
            avatarUrl: null,
            role: { displayName: 'Member', color: '#3B82F6' },
          },
        },
        {
          id: 'demo-3',
          stablePlayerId: 'demo:shooter3',
          playerName: 'Santos_Legend',
          factionName: 'LSPD',
          kills: 245,
          deaths: 104,
          headshots: 98,
          playtimeMinutes: 2900,
          wins: 19,
          losses: 9,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
          userId: null,
          user: {
            id: 'demo-user-3',
            username: 'Santos_Legend',
            avatarUrl: null,
            role: { displayName: 'Officer', color: '#10B981' },
          },
        },
        {
          id: 'demo-4',
          stablePlayerId: 'demo:shooter4',
          playerName: 'Shadow_Shooter',
          factionName: 'Ghetto',
          kills: 210,
          deaths: 95,
          headshots: 110,
          playtimeMinutes: 2400,
          wins: 15,
          losses: 12,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
          userId: null,
          user: null,
        },
      ] as any[];
    }

    // Filter nach Suchbegriff
    if (query) {
      playerList = playerList.filter(
        (p) =>
          p.playerName.toLowerCase().includes(query) ||
          (p.factionName && p.factionName.toLowerCase().includes(query)) ||
          (p.user?.username && p.user.username.toLowerCase().includes(query))
      );
    }

    // Ranking sortieren
    const sortedRankings = sortPlayerRankings(playerList);
    const topShooter = sortedRankings[0] || null;

    const sortedFactions = rankPlayerFactions(playerList);

    return NextResponse.json({
      connected: isConnected,
      sourceStatus: isConnected ? 'CONNECTED' : devMode ? 'DEMO_MODE' : 'NOT_CONFIGURED',
      statusMessage: isConnected
        ? 'Live verbunden mit FiveM Server'
        : devMode
        ? 'Demo-Entwicklungsmodus (Beispieldaten zur Ansicht)'
        : 'Noch keine Datenquelle verbunden',
      lastUpdated: lastSyncAt ? lastSyncAt.toISOString() : new Date().toISOString(),
      rankings: sortedRankings,
      topShooter,
      factions: sortedFactions,
      devMode: devMode && !isConnected,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
