/**
 * VEGA CrimeLife Ranking & Competition Utilities
 *
 * Ranking-Regeln:
 * 1. Primärwert: Kills (bei Spielern) bzw. Punkte / Siege (bei Wettbewerben)
 * 2. Zweitwertung (Tie-Breaker): K/D-Ratio (mit 2 Nachkommastellen)
 * 3. Drittwertung: Headshots
 * 4. K/D-Sicherheit: Division durch Null verhindert (wenn Deaths === 0, K/D = Kills / 1)
 */

export interface PlayerStats {
  id: string;
  stablePlayerId: string;
  playerName: string;
  factionName: string | null;
  kills: number;
  deaths: number;
  headshots: number;
  playtimeMinutes: number;
  wins: number;
  losses: number;
  lastSeenAt: string | Date;
  user?: {
    id: string;
    username: string;
    avatarUrl: string | null;
    role?: { displayName: string; color: string } | null;
  } | null;
}

export function calculateKD(kills: number, deaths: number): number {
  if (deaths <= 0) return kills > 0 ? kills : 0.0;
  return Number((kills / deaths).toFixed(2));
}

export function formatPlaytime(minutes: number): string {
  if (!minutes || minutes <= 0) return '0 Std.';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} Min.`;
  return `${hours} Std. ${remainingMinutes > 0 ? `${remainingMinutes} Min.` : ''}`.trim();
}

/**
 * Sortiert Spieler streng nach dokumentierten Rankingregeln:
 * Kills desc -> K/D desc -> Headshots desc -> Name asc
 */
export function sortPlayerRankings<T extends { kills: number; deaths: number; headshots: number; playerName: string }>(
  players: T[]
): (T & { rank: number; kd: number })[] {
  const enriched = players.map((p) => ({
    ...p,
    kd: calculateKD(p.kills, p.deaths),
  }));

  enriched.sort((a, b) => {
    if (b.kills !== a.kills) return b.kills - a.kills;
    if (b.kd !== a.kd) return b.kd - a.kd;
    if (b.headshots !== a.headshots) return b.headshots - a.headshots;
    return a.playerName.localeCompare(b.playerName);
  });

  return enriched.map((p, idx) => ({
    ...p,
    rank: idx + 1,
  }));
}

/**
 * Sortiert Fraktionen nach Kills -> Siege -> Name
 */
export function sortFactionRankings<T extends { factionName: string; kills: number; wins: number; membersCount: number }>(
  factions: T[]
): (T & { rank: number })[] {
  const copy = [...factions];
  copy.sort((a, b) => {
    if (b.kills !== a.kills) return b.kills - a.kills;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.factionName.localeCompare(b.factionName);
  });

  return copy.map((f, idx) => ({
    ...f,
    rank: idx + 1,
  }));
}

export function rankPlayerFactions(players: Pick<PlayerStats, 'factionName' | 'kills' | 'deaths' | 'wins' | 'losses'>[]) {
  const totals = new Map<string, {
    factionName: string; kills: number; deaths: number; wins: number; losses: number; membersCount: number;
  }>();
  for (const player of players) {
    const factionName = player.factionName || 'Fraktionslos';
    const faction = totals.get(factionName) ?? { factionName, kills: 0, deaths: 0, wins: 0, losses: 0, membersCount: 0 };
    faction.kills += player.kills;
    faction.deaths += player.deaths;
    faction.wins += player.wins;
    faction.losses += player.losses;
    faction.membersCount++;
    totals.set(factionName, faction);
  }
  return sortFactionRankings([...totals.values()]).map(faction => ({
    ...faction,
    memberCount: faction.membersCount,
    kd: calculateKD(faction.kills, faction.deaths),
  }));
}
