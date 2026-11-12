'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Crosshair,
  Skull,
  Clock,
  Search,
  Activity,
  Shield,
  Users,
  Swords,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  Sparkles,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Flame,
  Medal
} from 'lucide-react';

interface PlayerRank {
  rank: number;
  id: string;
  playerName: string;
  factionName: string | null;
  kills: number;
  deaths: number;
  kd: number;
  headshots: number;
  playtimeMinutes: number;
  playtimeFormatted: string;
  wins: number;
  losses: number;
  winRate: number;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
    role: { displayName: string; color: string };
  } | null;
  stablePlayerId?: string;
  lastSeenAt?: string;
}

interface FactionRank {
  rank: number;
  factionName: string;
  kills: number;
  deaths: number;
  kd: number;
  wins: number;
  losses: number;
  memberCount: number;
}

interface StatsApiResponse {
  connected: boolean;
  sourceStatus: string;
  statusMessage: string;
  lastUpdated: string | null;
  rankings: PlayerRank[];
  topShooter: PlayerRank | null;
  factions: FactionRank[];
  devMode: boolean;
}

export default function LiveStatsClient({
  initialData,
  initialDevMode = false,
}: {
  initialData: StatsApiResponse;
  initialDevMode?: boolean;
}) {
  const [data, setData] = useState<StatsApiResponse>(initialData);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'players' | 'factions'>('players');
  const [filter, setFilter] = useState<'all' | 'month' | 'week' | 'today'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [devMode, setDevMode] = useState(initialDevMode || initialData.devMode);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRank | null>(null);
  const [ingameApiPreview, setIngameApiPreview] = useState(false);

  const fetchData = async (isDev: boolean, timeframe: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stats?dev=${isDev ? 'true' : 'false'}&filter=${timeframe}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDevToggle = () => {
    const nextDev = !devMode;
    setDevMode(nextDev);
    fetchData(nextDev, filter);
  };

  const handleFilterChange = (newFilter: 'all' | 'month' | 'week' | 'today') => {
    setFilter(newFilter);
    fetchData(devMode, newFilter);
  };

  const filteredPlayers = useMemo(() => {
    if (!data.rankings) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return data.rankings;
    return data.rankings.filter(
      (p) =>
        p.playerName.toLowerCase().includes(q) ||
        (p.factionName && p.factionName.toLowerCase().includes(q)) ||
        (p.user && p.user.username.toLowerCase().includes(q))
    );
  }, [data.rankings, searchQuery]);

  const filteredFactions = useMemo(() => {
    if (!data.factions) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return data.factions;
    return data.factions.filter((f) => f.factionName.toLowerCase().includes(q));
  }, [data.factions, searchQuery]);

  const top3 = useMemo(() => {
    if (!data.rankings || data.rankings.length === 0) return [];
    return data.rankings.slice(0, 3);
  }, [data.rankings]);

  return (
    <div className="space-y-6">
      {/* 1. SEITEN-HEADER MIT STATUS-LEISTE */}
      <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="h-6 px-2.5 rounded-[4px] bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/30 text-[11px] font-semibold flex items-center gap-1.5 uppercase tracking-wide">
                <Crosshair className="w-3 h-3" />
                Live Statistiken
              </span>
              {devMode && (
                <span className="h-6 px-2 rounded-[4px] bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Entwickler-Vorschau aktiv
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F5F5F5] tracking-tight">
              Ranglisten & Shooter-Statistiken
            </h1>
            <p className="text-xs sm:text-sm text-[#A3A3A3] max-w-2xl">
              Offizielle Rangliste für FiveM Kills, Tode, K/D-Werte und Fraktionserfolge auf Vega Crimelife.
            </p>
          </div>

          {/* Verbindungsstatus & Dev-Schalter */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="bg-[#111111] border border-[#292929] rounded-[6px] px-3.5 py-2 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    data.connected
                      ? 'bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20'
                      : devMode
                      ? 'bg-amber-400 ring-4 ring-amber-400/20'
                      : 'bg-[#555555]'
                  }`}
                />
                <div className="text-left">
                  <p className="text-[10px] uppercase font-bold text-[#737373] tracking-wider leading-none">
                    Datenquelle
                  </p>
                  <p className="text-xs font-medium text-[#F5F5F5] mt-0.5 leading-none">
                    {data.connected
                      ? 'FiveM Server Live'
                      : devMode
                      ? 'Simulierte Beispieldaten'
                      : 'Nicht verbunden'}
                  </p>
                </div>
              </div>

              {data.lastUpdated && (
                <div className="border-l border-[#292929] pl-3 text-[11px] text-[#A3A3A3]">
                  <span>Sync: {new Date(data.lastUpdated).toLocaleTimeString('de-DE')}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleDevToggle}
              className={`h-9 px-3.5 text-xs font-medium rounded-[6px] border transition flex items-center gap-1.5 ${
                devMode
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                  : 'bg-[#111111] hover:bg-[#1D1D1D] border-[#292929] text-[#A3A3A3] hover:text-[#F5F5F5]'
              }`}
              title="Demo-Modus umschalten, um Beispieldaten zu sehen ohne Live-Serververbindung"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{devMode ? 'Demo beenden' : 'Demo-Modus'}</span>
            </button>

            <button
              onClick={() => setRulesOpen(!rulesOpen)}
              className="h-9 px-3 bg-[#111111] hover:bg-[#1D1D1D] text-[#A3A3A3] hover:text-[#F5F5F5] border border-[#292929] rounded-[6px] text-xs font-medium transition flex items-center gap-1.5"
            >
              <Info className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>Ranking-Regeln</span>
            </button>
          </div>
        </div>

        {/* Aufklappbare Ranking-Regeln */}
        {rulesOpen && (
          <div className="mt-4 pt-4 border-t border-[#292929] bg-[#111111]/60 p-4 rounded-[6px] text-xs text-[#A3A3A3] space-y-2">
            <div className="flex items-center justify-between text-[#F5F5F5] font-semibold text-xs">
              <span className="flex items-center gap-1.5 text-[#8B5CF6]">
                <Shield className="w-3.5 h-3.5" />
                Zentrale Ranking- & Wertungsregeln
              </span>
              <button
                onClick={() => setRulesOpen(false)}
                className="text-[#737373] hover:text-[#F5F5F5]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px] leading-relaxed">
              <div className="space-y-1">
                <p className="text-[#F5F5F5] font-medium">Reihenfolge bei Wertungsgleichstand (Tie-Breaker):</p>
                <ol className="list-decimal list-inside space-y-0.5 text-[#A3A3A3]">
                  <li><strong className="text-[#F5F5F5]">1. Bestätigte Kills:</strong> Primäre Einstufung aller Schützen.</li>
                  <li><strong className="text-[#F5F5F5]">2. K/D Ratio:</strong> Höhere Effizienz bei Kill-Gleichstand.</li>
                  <li><strong className="text-[#F5F5F5]">3. Headshots:</strong> Höhere Treffer-Präzision.</li>
                  <li><strong className="text-[#F5F5F5]">4. Alphabetisch:</strong> Letzte Instanz bei identischen Werten.</li>
                </ol>
              </div>
              <div className="space-y-1">
                <p className="text-[#F5F5F5] font-medium">Berechnung & Schnittstellen:</p>
                <p className="text-[#A3A3A3]">
                  • <strong>K/D Division durch Null:</strong> Spieler mit 0 Toden erhalten einen sicheren Teiler von 1.0 (z. B. 15 Kills / 0 Tode = K/D 15.00).
                </p>
                <p className="text-[#A3A3A3]">
                  • <strong>Manipulationsschutz:</strong> Öffentliche Endpunkte nehmen keine ungeprüften Browser-Events an. Nur autorisierte Server-Events via SHA-256 HMAC fließen in die Wertung ein.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DEV-HINWEIS-BANNER (WENN DEMO AKTIV) */}
      {devMode && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-[6px] p-3.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Entwicklermodus aktiv:</strong> Es werden verifizierte Beispieldaten visualisiert. Sobald dein FiveM-Server angebunden wird, werden diese durch Echtzeit-Logs ersetzt.
            </span>
          </div>
          <button
            onClick={handleDevToggle}
            className="text-amber-400 hover:text-amber-300 font-medium underline shrink-0 ml-3"
          >
            Zurück zur echten Datenquelle
          </button>
        </div>
      )}

      {/* 2. LEERZUSTAND OHNE DATENQUELLE (WENN NICHT VERBUNDEN & KEINE DATEN) */}
      {!data.connected && data.rankings.length === 0 && !devMode ? (
        <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-10 sm:p-14 text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#111111] border border-[#292929] flex items-center justify-center text-[#737373]">
            <Activity className="w-7 h-7" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-[#F5F5F5]">
              Noch keine Datenquelle verbunden
            </h3>
            <p className="text-xs sm:text-sm text-[#A3A3A3] leading-relaxed">
              Aktuell ist kein FiveM-Gameserver mit dem Forum synchronisiert. Sobald der Server eingerichtet und die Integrationsschnittstelle aktiviert wird, erscheinen hier automatisch die Live-Rankings, K/D-Werte und Shooter-Statistiken.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleDevToggle}
              className="h-9 px-4 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-medium rounded-[6px] transition inline-flex items-center gap-2 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Entwickler-Vorschau ansehen</span>
            </button>

            <button
              onClick={() => setIngameApiPreview(!ingameApiPreview)}
              className="h-9 px-4 bg-[#111111] hover:bg-[#1D1D1D] text-[#A3A3A3] hover:text-[#F5F5F5] text-xs font-medium rounded-[6px] border border-[#292929] transition inline-flex items-center gap-2"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>API Schnittstellen-Status</span>
            </button>
          </div>

          {ingameApiPreview && (
            <div className="max-w-xl mx-auto mt-6 p-4 bg-[#111111] border border-[#292929] rounded-[6px] text-left text-xs font-mono space-y-2 text-[#A3A3A3]">
              <div className="flex items-center justify-between text-[#8B5CF6]">
                <span className="font-semibold">Vorbereitete API-Endpunkte (v1):</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#161616] text-[#737373] border border-[#292929]">
                  INTEGRATION_NOT_CONFIGURED
                </span>
              </div>
              <p className="text-[11px] text-[#737373]">
                GET /api/v1/stats → Öffentliche Ranglisten & Ingame NUI JSON
              </p>
              <p className="text-[11px] text-[#737373]">
                POST /api/v1/stats → Bestätigte Server-Statistik-Events (SHA-256 Auth erforderlich)
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 3. TOP 3 PODIUM & BESTER SHOOTER HERO */}
          {top3.length > 0 && mode === 'players' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* BESTER SHOOTER HIGHLIGHT CARD */}
              {data.topShooter && (
                <div className="lg:col-span-1 bg-gradient-to-b from-[#8B5CF6]/15 via-[#161616] to-[#161616] border border-[#8B5CF6]/40 rounded-[8px] p-5 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Crosshair className="w-36 h-36 text-[#8B5CF6]" />
                  </div>

                  <div className="space-y-4 relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#8B5CF6] text-[11px] font-bold uppercase tracking-wider">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        Bester Shooter
                      </div>
                      <span className="text-[11px] font-semibold text-[#8B5CF6]">#1 Rang</span>
                    </div>

                    <div className="flex items-center gap-3.5 pt-1">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-[6px] bg-[#111111] border-2 border-[#8B5CF6] overflow-hidden flex items-center justify-center">
                          {data.topShooter.user?.avatarUrl ? (
                            <img
                              src={data.topShooter.user.avatarUrl}
                              alt={data.topShooter.playerName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="font-extrabold text-lg text-[#8B5CF6]">
                              {data.topShooter.playerName.substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-lg">
                          <CrownIcon className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-[#F5F5F5] truncate">
                          {data.topShooter.playerName}
                        </h3>
                        <p className="text-xs text-[#8B5CF6] font-medium truncate">
                          {data.topShooter.factionName || 'Keine Fraktion'}
                        </p>
                        {data.topShooter.user && (
                          <span className="text-[10px] text-[#737373] block truncate">
                            Forum: @{data.topShooter.user.username}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-2.5 text-center">
                        <p className="text-[10px] uppercase font-bold text-[#737373]">Kills</p>
                        <p className="text-base font-extrabold text-[#F5F5F5] mt-0.5">
                          {data.topShooter.kills}
                        </p>
                      </div>
                      <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-2.5 text-center">
                        <p className="text-[10px] uppercase font-bold text-[#737373]">K/D</p>
                        <p className="text-base font-extrabold text-[#8B5CF6] mt-0.5">
                          {data.topShooter.kd.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-2.5 text-center">
                        <p className="text-[10px] uppercase font-bold text-[#737373]">Headshots</p>
                        <p className="text-base font-extrabold text-amber-400 mt-0.5">
                          {data.topShooter.headshots}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedPlayer(data.topShooter)}
                    className="mt-4 w-full h-8 bg-[#111111] hover:bg-[#1D1D1D] text-[#8B5CF6] hover:text-[#A78BFA] border border-[#8B5CF6]/30 rounded-[5px] text-xs font-medium transition flex items-center justify-center gap-1.5"
                  >
                    <span>Spielerprofil einsehen</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* PODIUM TOP 3 COMPACT */}
              <div className="lg:col-span-2 bg-[#161616] border border-[#292929] rounded-[8px] p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-[#F5F5F5]">Top 3 Schützen Podium</h3>
                  </div>
                  <span className="text-[11px] text-[#737373]">Bestätigte Trefferquote</span>
                </div>

                <div className="grid grid-cols-3 gap-3 py-4 items-end">
                  {/* Platz 2 (Silber) */}
                  {top3[1] && (
                    <div
                      onClick={() => setSelectedPlayer(top3[1])}
                      className="cursor-pointer bg-[#111111] hover:bg-[#1A1A1A] border border-[#292929] hover:border-slate-400/50 rounded-[6px] p-3 text-center transition flex flex-col items-center group relative pt-4"
                    >
                      <div className="absolute -top-3 w-6 h-6 rounded-full bg-slate-300 text-black font-extrabold text-[11px] flex items-center justify-center shadow">
                        2
                      </div>
                      <div className="w-11 h-11 rounded-full bg-[#161616] border-2 border-slate-300 overflow-hidden mb-2 mt-1">
                        {top3[1].user?.avatarUrl ? (
                          <img src={top3[1].user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-slate-300 text-xs">
                            {top3[1].playerName.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-bold text-[#F5F5F5] group-hover:text-slate-300 transition truncate max-w-full">
                        {top3[1].playerName}
                      </p>
                      <p className="text-[10px] text-[#737373] truncate max-w-full">
                        {top3[1].factionName || 'Neutral'}
                      </p>
                      <div className="mt-2 pt-2 border-t border-[#292929] w-full flex items-center justify-around text-[10px]">
                        <div>
                          <span className="text-[#737373] block">Kills</span>
                          <span className="font-bold text-[#F5F5F5]">{top3[1].kills}</span>
                        </div>
                        <div>
                          <span className="text-[#737373] block">K/D</span>
                          <span className="font-bold text-slate-300">{top3[1].kd.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Platz 1 (Gold) */}
                  {top3[0] && (
                    <div
                      onClick={() => setSelectedPlayer(top3[0])}
                      className="cursor-pointer bg-gradient-to-b from-[#8B5CF6]/20 to-[#111111] hover:to-[#181818] border border-[#8B5CF6] rounded-[6px] p-3.5 text-center transition flex flex-col items-center group relative pt-5 shadow-lg shadow-[#8B5CF6]/5"
                    >
                      <div className="absolute -top-3.5 w-7 h-7 rounded-full bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center shadow-md ring-2 ring-[#8B5CF6]/50">
                        1
                      </div>
                      <div className="w-13 h-13 rounded-full bg-[#161616] border-2 border-amber-400 overflow-hidden mb-2 mt-1">
                        {top3[0].user?.avatarUrl ? (
                          <img src={top3[0].user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-amber-400 text-sm">
                            {top3[0].playerName.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-extrabold text-[#F5F5F5] group-hover:text-[#8B5CF6] transition truncate max-w-full">
                        {top3[0].playerName}
                      </p>
                      <p className="text-[10px] text-[#8B5CF6] font-medium truncate max-w-full">
                        {top3[0].factionName || 'Neutral'}
                      </p>
                      <div className="mt-2.5 pt-2 border-t border-[#292929] w-full flex items-center justify-around text-[10px]">
                        <div>
                          <span className="text-[#737373] block">Kills</span>
                          <span className="font-extrabold text-amber-400">{top3[0].kills}</span>
                        </div>
                        <div>
                          <span className="text-[#737373] block">K/D</span>
                          <span className="font-extrabold text-[#8B5CF6]">{top3[0].kd.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[#737373] block">HS</span>
                          <span className="font-extrabold text-[#F5F5F5]">{top3[0].headshots}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Platz 3 (Bronze) */}
                  {top3[2] && (
                    <div
                      onClick={() => setSelectedPlayer(top3[2])}
                      className="cursor-pointer bg-[#111111] hover:bg-[#1A1A1A] border border-[#292929] hover:border-amber-700/50 rounded-[6px] p-3 text-center transition flex flex-col items-center group relative pt-4"
                    >
                      <div className="absolute -top-3 w-6 h-6 rounded-full bg-amber-700 text-white font-extrabold text-[11px] flex items-center justify-center shadow">
                        3
                      </div>
                      <div className="w-11 h-11 rounded-full bg-[#161616] border-2 border-amber-700 overflow-hidden mb-2 mt-1">
                        {top3[2].user?.avatarUrl ? (
                          <img src={top3[2].user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-amber-600 text-xs">
                            {top3[2].playerName.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-bold text-[#F5F5F5] group-hover:text-amber-500 transition truncate max-w-full">
                        {top3[2].playerName}
                      </p>
                      <p className="text-[10px] text-[#737373] truncate max-w-full">
                        {top3[2].factionName || 'Neutral'}
                      </p>
                      <div className="mt-2 pt-2 border-t border-[#292929] w-full flex items-center justify-around text-[10px]">
                        <div>
                          <span className="text-[#737373] block">Kills</span>
                          <span className="font-bold text-[#F5F5F5]">{top3[2].kills}</span>
                        </div>
                        <div>
                          <span className="text-[#737373] block">K/D</span>
                          <span className="font-bold text-amber-600">{top3[2].kd.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-[#737373] text-center pt-2 border-t border-[#292929]">
                  Tippe auf einen Schützen, um sein vollständiges Leistungsprofil aufzurufen.
                </p>
              </div>
            </div>
          )}

          {/* 4. FILTER- & STEUERUNGSLEISTE */}
          <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Modus Umschaltung: Spieler vs Fraktionen */}
            <div className="flex items-center gap-1 bg-[#111111] p-1 rounded-[6px] border border-[#292929] w-full md:w-auto">
              <button
                onClick={() => setMode('players')}
                className={`flex-1 md:flex-initial h-8 px-4 rounded-[4px] text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                  mode === 'players'
                    ? 'bg-[#8B5CF6] text-white shadow-sm'
                    : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Spieler-Rangliste</span>
              </button>

              <button
                onClick={() => setMode('factions')}
                className={`flex-1 md:flex-initial h-8 px-4 rounded-[4px] text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                  mode === 'factions'
                    ? 'bg-[#8B5CF6] text-white shadow-sm'
                    : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Fraktionen-Rangliste</span>
              </button>
            </div>

            {/* Zeitfilter & Suchleiste */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Zeitfilter */}
              <div className="flex items-center bg-[#111111] p-1 rounded-[6px] border border-[#292929] text-[11px]">
                {(
                  [
                    { id: 'all', label: 'Gesamt' },
                    { id: 'month', label: 'Diesen Monat' },
                    { id: 'week', label: 'Diese Woche' },
                    { id: 'today', label: 'Heute' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleFilterChange(t.id)}
                    className={`h-7 px-2.5 rounded-[4px] font-medium transition ${
                      filter === t.id
                        ? 'bg-[#1D1D1D] text-[#8B5CF6] border border-[#292929]'
                        : 'text-[#737373] hover:text-[#F5F5F5]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Suchleiste */}
              <div className="relative flex-1 md:w-60">
                <Search className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={mode === 'players' ? 'Spieler suchen...' : 'Fraktion suchen...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 bg-[#111111] border border-[#292929] rounded-[6px] text-xs text-[#F5F5F5] placeholder-[#737373] focus:outline-none focus:border-[#8B5CF6]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#F5F5F5]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 5. TABELLEN-DARSTELLUNG */}
          {mode === 'players' ? (
            <div className="bg-[#161616] border border-[#292929] rounded-[8px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#111111] border-b border-[#292929] text-[10px] uppercase font-bold text-[#737373] tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-14 text-center">Rang</th>
                      <th className="py-3 px-4">Spieler</th>
                      <th className="py-3 px-4">Fraktion</th>
                      <th className="py-3 px-4 text-right">Kills</th>
                      <th className="py-3 px-4 text-right">Tode</th>
                      <th className="py-3 px-4 text-right">K/D</th>
                      <th className="py-3 px-4 text-right">Headshots</th>
                      <th className="py-3 px-4 text-right">Spielzeit</th>
                      <th className="py-3 px-4 text-right">Siege / Niederlagen</th>
                      <th className="py-3 px-4 w-12 text-center">Aktion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#292929]">
                    {filteredPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-10 text-center text-[#737373]">
                          Keine Schützen gefunden für diesen Suchbegriff oder Zeitraum.
                        </td>
                      </tr>
                    ) : (
                      filteredPlayers.map((player) => {
                        const isTop1 = player.rank === 1;
                        const isTop2 = player.rank === 2;
                        const isTop3 = player.rank === 3;

                        return (
                          <tr
                            key={player.id}
                            onClick={() => setSelectedPlayer(player)}
                            className="hover:bg-[#1A1A1A] cursor-pointer transition group"
                          >
                            <td className="py-3.5 px-4 text-center">
                              {isTop1 ? (
                                <span className="inline-flex w-6 h-6 rounded-full bg-amber-400 text-black font-extrabold text-[11px] items-center justify-center shadow">
                                  1
                                </span>
                              ) : isTop2 ? (
                                <span className="inline-flex w-6 h-6 rounded-full bg-slate-300 text-black font-bold text-[11px] items-center justify-center">
                                  2
                                </span>
                              ) : isTop3 ? (
                                <span className="inline-flex w-6 h-6 rounded-full bg-amber-700 text-white font-bold text-[11px] items-center justify-center">
                                  3
                                </span>
                              ) : (
                                <span className="text-[#737373] font-semibold text-xs">
                                  #{player.rank}
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-[4px] bg-[#111111] border border-[#292929] overflow-hidden flex items-center justify-center shrink-0">
                                  {player.user?.avatarUrl ? (
                                    <img
                                      src={player.user.avatarUrl}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-[10px] font-bold text-[#8B5CF6]">
                                      {player.playerName.substring(0, 2).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <span className="font-semibold text-[#F5F5F5] group-hover:text-[#8B5CF6] transition block">
                                    {player.playerName}
                                  </span>
                                  {player.user && (
                                    <span className="text-[10px] text-[#737373] block">
                                      @{player.user.username}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              {player.factionName ? (
                                <span className="px-2 py-0.5 rounded-[4px] bg-[#111111] border border-[#292929] text-[11px] text-[#A3A3A3] font-medium">
                                  {player.factionName}
                                </span>
                              ) : (
                                <span className="text-[#555555] text-[11px]">–</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right font-bold text-[#F5F5F5]">
                              {player.kills.toLocaleString('de-DE')}
                            </td>

                            <td className="py-3.5 px-4 text-right text-[#A3A3A3]">
                              {player.deaths.toLocaleString('de-DE')}
                            </td>

                            <td className="py-3.5 px-4 text-right font-extrabold text-[#8B5CF6]">
                              {player.kd.toFixed(2)}
                            </td>

                            <td className="py-3.5 px-4 text-right text-amber-400 font-medium">
                              {player.headshots.toLocaleString('de-DE')}
                            </td>

                            <td className="py-3.5 px-4 text-right text-[#A3A3A3]">
                              {player.playtimeFormatted}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <span className="text-emerald-400 font-medium">{player.wins}W</span>
                              <span className="text-[#555555] mx-1">/</span>
                              <span className="text-rose-400 font-medium">{player.losses}L</span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <Eye className="w-3.5 h-3.5 text-[#737373] group-hover:text-[#8B5CF6] mx-auto transition" />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* FRAKTIONEN-TABELLE */
            <div className="bg-[#161616] border border-[#292929] rounded-[8px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#111111] border-b border-[#292929] text-[10px] uppercase font-bold text-[#737373] tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-14 text-center">Rang</th>
                      <th className="py-3 px-4">Fraktion</th>
                      <th className="py-3 px-4 text-right">Mitglieder</th>
                      <th className="py-3 px-4 text-right">Kills Gesamt</th>
                      <th className="py-3 px-4 text-right">Tode</th>
                      <th className="py-3 px-4 text-right">K/D</th>
                      <th className="py-3 px-4 text-right">Siege / Niederlagen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#292929]">
                    {filteredFactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-[#737373]">
                          Keine Fraktionsstatistiken gefunden.
                        </td>
                      </tr>
                    ) : (
                      filteredFactions.map((fac) => (
                        <tr key={fac.factionName} className="hover:bg-[#1A1A1A] transition">
                          <td className="py-3.5 px-4 text-center font-bold text-xs text-[#737373]">
                            #{fac.rank}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded bg-[#111111] border border-[#292929] flex items-center justify-center text-[#8B5CF6]">
                                <Shield className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-bold text-[#F5F5F5]">{fac.factionName}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right text-[#A3A3A3]">
                            {fac.memberCount} Spieler
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-[#F5F5F5]">
                            {fac.kills.toLocaleString('de-DE')}
                          </td>
                          <td className="py-3.5 px-4 text-right text-[#A3A3A3]">
                            {fac.deaths.toLocaleString('de-DE')}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-[#8B5CF6]">
                            {fac.kd.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="text-emerald-400 font-medium">{fac.wins}W</span>
                            <span className="text-[#555555] mx-1">/</span>
                            <span className="text-rose-400 font-medium">{fac.losses}L</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* 6. SPIELER-DETAIL-MODAL (PROFIL INSPEKTION) */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161616] border border-[#292929] rounded-[8px] max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#292929] flex items-start justify-between bg-gradient-to-r from-[#8B5CF6]/10 to-transparent">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-[6px] bg-[#111111] border-2 border-[#8B5CF6] overflow-hidden flex items-center justify-center">
                  {selectedPlayer.user?.avatarUrl ? (
                    <img
                      src={selectedPlayer.user.avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-extrabold text-xl text-[#8B5CF6]">
                      {selectedPlayer.playerName.substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[#F5F5F5]">
                      {selectedPlayer.playerName}
                    </h3>
                    <span className="px-2 py-0.5 rounded-[4px] bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#8B5CF6] text-[10px] font-bold">
                      Rang #{selectedPlayer.rank}
                    </span>
                  </div>
                  <p className="text-xs text-[#A3A3A3] mt-0.5">
                    {selectedPlayer.factionName ? (
                      <span>Fraktion: <strong className="text-[#F5F5F5]">{selectedPlayer.factionName}</strong></span>
                    ) : (
                      'Keine Fraktion zugewiesen'
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedPlayer(null)}
                className="p-1 text-[#737373] hover:text-[#F5F5F5] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              {/* Verknüpftes Konto Info */}
              <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-3 text-xs flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-[#737373]">
                    Verknüpftes Forum-Konto
                  </p>
                  {selectedPlayer.user ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-semibold text-[#F5F5F5]">
                        {selectedPlayer.user.username}
                      </span>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${selectedPlayer.user.role.color}15`,
                          color: selectedPlayer.user.role.color,
                        }}
                      >
                        {selectedPlayer.user.role.displayName}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[#A3A3A3] mt-1">Kein Foren-Account gekoppelt</p>
                  )}
                </div>

                {selectedPlayer.user && (
                  <Link
                    href={`/user/${selectedPlayer.user.username}`}
                    className="h-7 px-3 bg-[#161616] hover:bg-[#1D1D1D] text-[#8B5CF6] border border-[#292929] rounded-[4px] text-[11px] font-medium transition inline-flex items-center gap-1"
                  >
                    <span>Profil</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-2.5">
                  <span className="text-[10px] uppercase font-bold text-[#737373] block">Kills</span>
                  <span className="text-base font-extrabold text-[#F5F5F5] mt-0.5 block">
                    {selectedPlayer.kills}
                  </span>
                </div>
                <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-2.5">
                  <span className="text-[10px] uppercase font-bold text-[#737373] block">Tode</span>
                  <span className="text-base font-extrabold text-[#A3A3A3] mt-0.5 block">
                    {selectedPlayer.deaths}
                  </span>
                </div>
                <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-2.5">
                  <span className="text-[10px] uppercase font-bold text-[#737373] block">K/D Ratio</span>
                  <span className="text-base font-extrabold text-[#8B5CF6] mt-0.5 block">
                    {selectedPlayer.kd.toFixed(2)}
                  </span>
                </div>
                <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-2.5">
                  <span className="text-[10px] uppercase font-bold text-[#737373] block">Headshots</span>
                  <span className="text-base font-extrabold text-amber-400 mt-0.5 block">
                    {selectedPlayer.headshots}
                  </span>
                </div>
              </div>

              {/* Sekundäre Statistiken */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-3">
                  <span className="text-[10px] uppercase font-bold text-[#737373] block">
                    Wettbewerbsbilanz
                  </span>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-emerald-400 font-bold">{selectedPlayer.wins} Siege</span>
                    <span className="text-rose-400 font-bold">{selectedPlayer.losses} Niederlagen</span>
                    <span className="text-[#8B5CF6] font-semibold">{selectedPlayer.winRate}% Win</span>
                  </div>
                </div>

                <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-3">
                  <span className="text-[10px] uppercase font-bold text-[#737373] block">
                    Spielzeit auf Server
                  </span>
                  <p className="text-sm font-bold text-[#F5F5F5] mt-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    {selectedPlayer.playtimeFormatted}
                  </p>
                </div>
              </div>

              {/* Schnittstellen-Kennung (Sicher zensiert) */}
              <div className="p-3 bg-[#111111]/70 border border-[#292929] rounded-[6px] text-[11px] text-[#737373] flex items-center justify-between">
                <span>FiveM Bindung: Verifiziert</span>
                <span className="font-mono text-[#555555]">
                  ID: {selectedPlayer.stablePlayerId ? `${selectedPlayer.stablePlayerId.substring(0, 10)}...` : 'geschützt'}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#111111] border-t border-[#292929] flex justify-end">
              <button
                onClick={() => setSelectedPlayer(null)}
                className="h-8 px-4 bg-[#161616] hover:bg-[#1D1D1D] text-[#F5F5F5] border border-[#292929] rounded-[5px] text-xs font-medium transition"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
    </svg>
  );
}
