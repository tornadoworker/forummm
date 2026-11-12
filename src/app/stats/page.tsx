import React from 'react';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { sortPlayerRankings, rankPlayerFactions } from '@/lib/rankings';
import LiveStatsClient from '@/components/LiveStatsClient';

export const revalidate = 0;

export const metadata = {
  title: 'Live Statistik | VEGA CrimeLife',
  description: 'Offizielle Ranglisten für Kills, K/D, Headshots und Fraktionen auf VEGA CrimeLife.',
};

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ dev?: string; filter?: string }>;
}) {
  const resolvedParams = await searchParams;
  const isDev = resolvedParams?.dev === 'true';

  // 1. FiveM Konfiguration abrufen
  const fivemConfig = await prisma.integrationConfig.findUnique({
    where: { name: 'FIVEM_SERVER' },
  });

  const isConnected = Boolean(fivemConfig?.isEnabled && fivemConfig?.status === 'CONNECTED');
  const lastSyncAt = fivemConfig?.lastSyncAt ? fivemConfig.lastSyncAt.toISOString() : null;

  // 2. Snapshots laden
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

  // Falls keine echten Daten und kein Dev-Modus:
  if (!isConnected && rawSnapshots.length === 0 && !isDev) {
    const emptyPayload = {
      connected: false,
      sourceStatus: 'NOT_CONNECTED',
      statusMessage: 'Noch keine Datenquelle verbunden',
      lastUpdated: null,
      rankings: [],
      topShooter: null,
      factions: [],
      devMode: false,
    };

    return <LiveStatsClient initialData={emptyPayload} initialDevMode={false} />;
  }

  // Beispieldaten wenn Dev-Modus aktiv und keine echten Daten vorliegen
  let playerList: any[] = rawSnapshots;
  if (rawSnapshots.length === 0 && isDev) {
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
        playerName: 'NightHunter',
        factionName: 'Vagos',
        kills: 264,
        deaths: 104,
        headshots: 130,
        playtimeMinutes: 3100,
        wins: 19,
        losses: 9,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
        userId: null,
        user: {
          id: 'demo-user-3',
          username: 'NightHunter',
          avatarUrl: null,
          role: { displayName: 'Member', color: '#3B82F6' },
        },
      },
      {
        id: 'demo-4',
        stablePlayerId: 'demo:shooter4',
        playerName: 'ShadowGhost',
        factionName: 'East Side Ballas',
        kills: 215,
        deaths: 98,
        headshots: 88,
        playtimeMinutes: 2400,
        wins: 15,
        losses: 11,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
        userId: null,
        user: null,
      },
      {
        id: 'demo-5',
        stablePlayerId: 'demo:shooter5',
        playerName: 'CripxVega',
        factionName: 'Crips',
        kills: 190,
        deaths: 110,
        headshots: 75,
        playtimeMinutes: 2000,
        wins: 12,
        losses: 14,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
        userId: null,
        user: null,
      },
    ];
  }

  const sortedRankings = sortPlayerRankings(playerList);
  const factionRankings = rankPlayerFactions(playerList);
  const topShooter = sortedRankings.length > 0 ? sortedRankings[0] : null;

  const payload = {
    connected: isConnected,
    sourceStatus: isConnected ? 'CONNECTED' : isDev ? 'DEMO_MODE' : 'NOT_CONNECTED',
    statusMessage: isConnected
      ? 'FiveM Server synchronisiert'
      : isDev
      ? 'Entwicklungsmodus mit Beispieldaten'
      : 'Noch keine Datenquelle verbunden',
    lastUpdated: lastSyncAt || (isDev ? new Date().toISOString() : null),
    rankings: sortedRankings,
    topShooter,
    factions: factionRankings,
    devMode: isDev,
  };

  return <LiveStatsClient initialData={payload} initialDevMode={isDev} />;
}
