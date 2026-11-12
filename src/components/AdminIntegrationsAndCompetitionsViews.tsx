'use client';

import React, { useState } from 'react';
import {
  Swords,
  Trophy,
  Users,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  ChevronRight,
  Clock,
  Server,
  Database,
  Radio,
  Key,
  RefreshCw,
  Sliders,
  Check,
  X,
  Copy,
  Shield,
  Activity,
  Layers,
  FileCode,
  Flame
} from 'lucide-react';

interface CompetitionItem {
  id: string;
  title: string;
  slug: string;
  type: '1V1' | 'TEAM';
  status: 'PLANNED' | 'REGISTRATION_OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  maxParticipants: number;
  creator: { username: string };
  _count: { participants: number; matches: number };
}

interface MatchItem {
  id: string;
  status: string;
  challengerScore: number;
  challengedScore: number;
  challenger: { id: string; username: string } | null;
  challenged: { id: string; username: string } | null;
  winner: { id: string; username: string } | null;
}

interface IntegrationConfigItem {
  id: string;
  name: string;
  isEnabled: boolean;
  status: string;
  lastSyncAt: string | null;
  rateLimitPerMin: number;
  apiKeyHash?: string | null;
}

interface IntegrationLogItem {
  id: string;
  source: string;
  level: string;
  message: string;
  createdAt: string;
}

// -------------------------------------------------------------
// 1. ACP: WETTBEWERBE & TURNIERE VIEW
// -------------------------------------------------------------
export function AdminCompetitionsView({
  competitions: initialCompetitions,
  matches: initialMatches,
  onShowMsg,
}: {
  competitions: CompetitionItem[];
  matches: MatchItem[];
  onShowMsg: (msg: string, isErr?: boolean) => void;
}) {
  const [competitions, setCompetitions] = useState<CompetitionItem[]>(initialCompetitions);
  const [matches, setMatches] = useState<MatchItem[]>(initialMatches);
  const [editingMatch, setEditingMatch] = useState<MatchItem | null>(null);
  const [matchWinnerId, setMatchWinnerId] = useState('');
  const [matchScore1, setMatchScore1] = useState(0);
  const [matchScore2, setMatchScore2] = useState(0);
  const [savingMatch, setSavingMatch] = useState(false);

  const handleStatusChange = async (competitionId: string, status: string) => {
    try {
      const res = await fetch('/api/admin/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_COMPETITION_STATUS', competitionId, status }),
      });
      if (res.ok) {
        setCompetitions((prev) =>
          prev.map((c) => (c.id === competitionId ? { ...c, status: status as any } : c))
        );
        onShowMsg('Turnierstatus erfolgreich aktualisiert.');
      } else {
        onShowMsg('Fehler beim Ändern des Status.', true);
      }
    } catch {
      onShowMsg('Serverfehler.', true);
    }
  };

  const handleSaveMatchResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;
    setSavingMatch(true);
    try {
      const res = await fetch('/api/admin/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_MATCH_RESULT',
          matchId: editingMatch.id,
          winnerId: matchWinnerId || null,
          score1: matchScore1,
          score2: matchScore2,
          status: 'COMPLETED',
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setMatches((prev) =>
          prev.map((m) => (m.id === editingMatch.id ? { ...m, ...json.match } : m))
        );
        onShowMsg('Match-Ergebnis manuell festgelegt.');
        setEditingMatch(null);
      } else {
        onShowMsg('Fehler beim Speichern des Matches.', true);
      }
    } catch {
      onShowMsg('Serverfehler.', true);
    } finally {
      setSavingMatch(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
        <div>
          <h2 className="text-base font-bold text-[#F5F5F5] flex items-center gap-2">
            <Swords className="w-4 h-4 text-[#8B5CF6]" />
            Wettbewerbe, Duelle & Moderation
          </h2>
          <p className="text-xs text-[#A3A3A3] mt-0.5">
            Verwalte aktive Turniere, passe Status an und moderiere Duell-Ergebnisse.
          </p>
        </div>
      </div>

      {/* Turniere Tabelle */}
      <div className="bg-[#161616] border border-[#292929] rounded-[8px] overflow-hidden">
        <div className="p-4 border-b border-[#292929] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#F5F5F5]">Angelegte Wettbewerbe</h3>
          <span className="text-xs text-[#737373]">{competitions.length} Turniere</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] border-b border-[#292929] text-[10px] uppercase font-bold text-[#737373] tracking-wider">
              <tr>
                <th className="py-3 px-4">Titel & Format</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Teilnehmer</th>
                <th className="py-3 px-4">Matches</th>
                <th className="py-3 px-4">Ersteller</th>
                <th className="py-3 px-4 text-right">Status ändern</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#292929]">
              {competitions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#737373]">
                    Noch keine Turniere hinterlegt.
                  </td>
                </tr>
              ) : (
                competitions.map((comp) => (
                  <tr key={comp.id} className="hover:bg-[#1A1A1A] transition">
                    <td className="py-3 px-4 font-semibold text-[#F5F5F5]">
                      <div>{comp.title}</div>
                      <span className="text-[10px] text-[#8B5CF6] font-normal uppercase">
                        {comp.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          comp.status === 'REGISTRATION_OPEN'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : comp.status === 'IN_PROGRESS'
                            ? 'bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/30'
                            : comp.status === 'COMPLETED'
                            ? 'bg-[#222222] text-[#737373]'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {comp.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#A3A3A3]">
                      {comp._count.participants} / {comp.maxParticipants}
                    </td>
                    <td className="py-3 px-4 text-[#A3A3A3]">{comp._count.matches}</td>
                    <td className="py-3 px-4 text-[#737373]">{comp.creator.username}</td>
                    <td className="py-3 px-4 text-right">
                      <select
                        value={comp.status}
                        onChange={(e) => handleStatusChange(comp.id, e.target.value)}
                        className="h-7 px-2 bg-[#111111] border border-[#292929] rounded text-[11px] text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                      >
                        <option value="PLANNED">Geplant</option>
                        <option value="REGISTRATION_OPEN">Anmeldung offen</option>
                        <option value="IN_PROGRESS">Läuft</option>
                        <option value="COMPLETED">Abgeschlossen</option>
                        <option value="CANCELLED">Abgebrochen</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Matches Moderation */}
      <div className="bg-[#161616] border border-[#292929] rounded-[8px] overflow-hidden">
        <div className="p-4 border-b border-[#292929] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#F5F5F5]">1v1 Duelle & Match-Ergebnisse</h3>
          <span className="text-xs text-[#737373]">{matches.length} Duelle gelistet</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] border-b border-[#292929] text-[10px] uppercase font-bold text-[#737373] tracking-wider">
              <tr>
                <th className="py-3 px-4">Herausforderer</th>
                <th className="py-3 px-4">Gegner</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Gewinner</th>
                <th className="py-3 px-4 text-right">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#292929]">
              {matches.slice(0, 15).map((m) => (
                <tr key={m.id} className="hover:bg-[#1A1A1A] transition">
                  <td className="py-3 px-4 text-[#F5F5F5] font-medium">
                    {m.challenger?.username || 'Unbekannt'}
                  </td>
                  <td className="py-3 px-4 text-[#F5F5F5]">
                    {m.challenged?.username || 'Unbekannt'}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-amber-400">
                    {m.challengerScore} : {m.challengedScore}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#111111] text-[#A3A3A3] border border-[#292929]">
                      {m.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-emerald-400 font-medium">
                    {m.winner?.username || '–'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setEditingMatch(m);
                        setMatchWinnerId(m.winner?.id || m.challenger?.id || '');
                        setMatchScore1(m.challengerScore);
                        setMatchScore2(m.challengedScore);
                      }}
                      className="h-7 px-2.5 bg-[#111111] hover:bg-[#1D1D1D] text-[#8B5CF6] border border-[#292929] rounded text-[11px] transition"
                    >
                      Ergebnis bearbeiten
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ranking Einstellungen Zusammenfassung */}
      <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-5 space-y-3">
        <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#8B5CF6]" />
          Ranking & Wertungsregeln (Festgelegt)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#A3A3A3]">
          <div className="bg-[#111111] p-3 rounded border border-[#292929] space-y-1">
            <span className="text-[#F5F5F5] font-semibold">Gleichstandsregelung (Tie-Breaker):</span>
            <p className="text-[11px]">1. Kills &rarr; 2. K/D Ratio &rarr; 3. Headshots &rarr; 4. Alphabetisch</p>
          </div>
          <div className="bg-[#111111] p-3 rounded border border-[#292929] space-y-1">
            <span className="text-[#F5F5F5] font-semibold">Division durch Null Schutz:</span>
            <p className="text-[11px]">Bei 0 Toden Teiler 1.0 (z. B. 12 Kills = K/D 12.00, keine Unendlichkeit)</p>
          </div>
        </div>
      </div>

      {/* Modal: Match Ergebnis manuell eintragen */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161616] border border-[#292929] rounded-[8px] max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
              <h3 className="text-sm font-bold text-[#F5F5F5]">Match-Ergebnis festlegen</h3>
              <button onClick={() => setEditingMatch(null)} className="text-[#737373] hover:text-[#F5F5F5]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMatchResult} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A3A3A3] mb-1">
                    {editingMatch.challenger?.username || 'P1'} Kills:
                  </label>
                  <input
                    type="number"
                    value={matchScore1}
                    onChange={(e) => setMatchScore1(parseInt(e.target.value) || 0)}
                    className="w-full h-8 px-2 bg-[#111111] border border-[#292929] rounded text-[#F5F5F5]"
                  />
                </div>
                <div>
                  <label className="block text-[#A3A3A3] mb-1">
                    {editingMatch.challenged?.username || 'P2'} Kills:
                  </label>
                  <input
                    type="number"
                    value={matchScore2}
                    onChange={(e) => setMatchScore2(parseInt(e.target.value) || 0)}
                    className="w-full h-8 px-2 bg-[#111111] border border-[#292929] rounded text-[#F5F5F5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#A3A3A3] mb-1">Gewinner festlegen:</label>
                <select
                  value={matchWinnerId}
                  onChange={(e) => setMatchWinnerId(e.target.value)}
                  className="w-full h-8 px-2 bg-[#111111] border border-[#292929] rounded text-[#F5F5F5]"
                >
                  <option value="">Kein Gewinner (Unentschieden)</option>
                  {editingMatch.challenger && (
                    <option value={editingMatch.challenger.id}>
                      {editingMatch.challenger.username}
                    </option>
                  )}
                  {editingMatch.challenged && (
                    <option value={editingMatch.challenged.id}>
                      {editingMatch.challenged.username}
                    </option>
                  )}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="h-8 px-3 bg-[#111111] hover:bg-[#1D1D1D] text-[#A3A3A3] rounded border border-[#292929]"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={savingMatch}
                  className="h-8 px-3.5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white rounded font-medium"
                >
                  {savingMatch ? 'Speichere...' : 'Speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 2. ACP: INTEGRATIONSSTATUS & API KONFIGURATION
// -------------------------------------------------------------
export function AdminIntegrationsView({
  configs: initialConfigs,
  logs: initialLogs,
  onShowMsg,
}: {
  configs: IntegrationConfigItem[];
  logs: IntegrationLogItem[];
  onShowMsg: (msg: string, isErr?: boolean) => void;
}) {
  const [configs, setConfigs] = useState<IntegrationConfigItem[]>(initialConfigs);
  const [logs, setLogs] = useState<IntegrationLogItem[]>(initialLogs);
  const [generatedKey, setGeneratedKey] = useState<{ name: string; key: string } | null>(null);

  const handleToggle = async (name: string, isEnabled: boolean) => {
    try {
      const res = await fetch('/api/admin/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TOGGLE_INTEGRATION', name, isEnabled }),
      });
      if (res.ok) {
        const json = await res.json();
        setConfigs((prev) =>
          prev.map((c) => (c.name === name ? { ...c, ...json.config } : c))
        );
        onShowMsg(`Integration ${name} auf ${isEnabled ? 'aktiviert' : 'deaktiviert'} gesetzt.`);
      } else {
        onShowMsg('Fehler beim Ändern des Status.', true);
      }
    } catch {
      onShowMsg('Serverfehler.', true);
    }
  };

  const handleGenerateKey = async (name: string) => {
    try {
      const res = await fetch('/api/admin/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GENERATE_API_KEY', name }),
      });
      if (res.ok) {
        const json = await res.json();
        setGeneratedKey({ name, key: json.rawKey });
        setConfigs((prev) =>
          prev.map((c) => (c.name === name ? { ...c, ...json.config } : c))
        );
        onShowMsg(`Neuer API Schlüssel für ${name} generiert.`);
      } else {
        onShowMsg('Fehler beim Generieren des Schlüssels.', true);
      }
    } catch {
      onShowMsg('Serverfehler.', true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
        <div>
          <h2 className="text-base font-bold text-[#F5F5F5] flex items-center gap-2">
            <Server className="w-4 h-4 text-[#8B5CF6]" />
            Integrationsstatus & API Konfiguration
          </h2>
          <p className="text-xs text-[#A3A3A3] mt-0.5">
            Schnittstellenverwaltung für FiveM Gameserver, Discord Bot und Ingame Oberflächen.
          </p>
        </div>
      </div>

      {/* Hinweis zur vorbereiteten API */}
      <div className="bg-[#111111] border border-[#292929] rounded-[8px] p-4 text-xs text-[#A3A3A3] flex items-start gap-3">
        <Radio className="w-4 h-4 text-[#8B5CF6] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-[#F5F5F5]">Vorbereitete Integrationsarchitektur (v1):</p>
          <p className="text-[11px] leading-relaxed">
            Schreibende Integrationsendpunkte (z. B. POST /api/v1/stats) bleiben standardmäßig im sicheren Zustand <code>INTEGRATION_NOT_CONFIGURED</code>.
            Sobald dein FiveM-Gameserver eingerichtet ist, aktiviere den Schalter unten und generiere einen SHA-256 API-Schlüssel.
          </p>
        </div>
      </div>

      {/* Neuer generierter Schlüssel Alert */}
      {generatedKey && (
        <div className="bg-amber-950/25 border border-amber-500/40 rounded-[8px] p-4 space-y-2">
          <div className="flex items-center justify-between text-amber-300 font-bold text-xs">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" />
              Neuer API Schlüssel für {generatedKey.name}
            </span>
            <button onClick={() => setGeneratedKey(null)} className="text-amber-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-amber-200/80">
            Kopiere diesen Schlüssel jetzt in deine <code>server.cfg</code> oder <code>.env</code>. Er wird auf dem Server nur als SHA-256 Hash gespeichert und kann nicht erneut angezeigt werden:
          </p>
          <div className="p-2.5 bg-[#111111] border border-amber-500/30 rounded font-mono text-xs text-[#F5F5F5] select-all flex items-center justify-between">
            <span>{generatedKey.key}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedKey.key);
                onShowMsg('Schlüssel in die Zwischenablage kopiert!');
              }}
              className="text-[#8B5CF6] hover:text-[#A78BFA] text-[11px] flex items-center gap-1 font-sans"
            >
              <Copy className="w-3 h-3" />
              <span>Kopieren</span>
            </button>
          </div>
        </div>
      )}

      {/* Integrations Karten Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. FIVEM SERVER */}
        {(() => {
          const cfg = configs.find((c) => c.name === 'FIVEM_SERVER');
          const isConn = cfg?.isEnabled && cfg?.status === 'CONNECTED';
          return (
            <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#737373]">Datenquelle</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      isConn
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-[#222222] text-[#737373] border border-[#292929]'
                    }`}
                  >
                    {isConn ? 'Verbunden' : 'Nicht eingerichtet'}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#F5F5F5]">FiveM Gameserver</h3>
                  <p className="text-[11px] text-[#A3A3A3] mt-1">
                    Liefert bestätigte Spielstatistiken, Kills, Tode und Duell-Ergebnisse.
                  </p>
                </div>

                <div className="text-[11px] font-mono text-[#737373] bg-[#111111] p-2 rounded border border-[#292929]">
                  POST /api/v1/stats
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#292929]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#A3A3A3]">Aktiviert:</span>
                  <button
                    onClick={() => handleToggle('FIVEM_SERVER', !cfg?.isEnabled)}
                    className={`w-10 h-5 rounded-full transition relative ${
                      cfg?.isEnabled ? 'bg-[#8B5CF6]' : 'bg-[#292929]'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition absolute top-0.5 ${
                        cfg?.isEnabled ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                <button
                  onClick={() => handleGenerateKey('FIVEM_SERVER')}
                  className="w-full h-7 bg-[#111111] hover:bg-[#1D1D1D] text-[#8B5CF6] border border-[#292929] rounded text-[11px] font-medium transition flex items-center justify-center gap-1.5"
                >
                  <Key className="w-3 h-3" />
                  <span>API Key generieren</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* 2. DISCORD BOT */}
        {(() => {
          const cfg = configs.find((c) => c.name === 'DISCORD_BOT');
          const isConn = cfg?.isEnabled && cfg?.status === 'CONNECTED';
          return (
            <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#737373]">Bot-Schnittstelle</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      isConn
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-[#222222] text-[#737373] border border-[#292929]'
                    }`}
                  >
                    {isConn ? 'Verbunden' : 'Nicht eingerichtet'}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#F5F5F5]">Discord Bot</h3>
                  <p className="text-[11px] text-[#A3A3A3] mt-1">
                    Verarbeitet Benachrichtigungen, Duell-Pings und Rollen-Synchronisierungen.
                  </p>
                </div>

                <div className="text-[11px] font-mono text-[#737373] bg-[#111111] p-2 rounded border border-[#292929]">
                  DISCORD_BOT_TOKEN
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#292929]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#A3A3A3]">Aktiviert:</span>
                  <button
                    onClick={() => handleToggle('DISCORD_BOT', !cfg?.isEnabled)}
                    className={`w-10 h-5 rounded-full transition relative ${
                      cfg?.isEnabled ? 'bg-[#8B5CF6]' : 'bg-[#292929]'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition absolute top-0.5 ${
                        cfg?.isEnabled ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                <button
                  onClick={() => handleGenerateKey('DISCORD_BOT')}
                  className="w-full h-7 bg-[#111111] hover:bg-[#1D1D1D] text-[#8B5CF6] border border-[#292929] rounded text-[11px] font-medium transition flex items-center justify-center gap-1.5"
                >
                  <Key className="w-3 h-3" />
                  <span>Bot Token hash</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* 3. INGAME NUI OBERFLÄCHE */}
        <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-[#737373]">Ingame UI</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                Bereit (Read-Only)
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#F5F5F5]">Ingame Ranglisten Abruf</h3>
              <p className="text-[11px] text-[#A3A3A3] mt-1">
                Öffentliche JSON-Ranglisten für FiveM NUI / HUD Clients ohne interne Spielerkennungen.
              </p>
            </div>

            <div className="text-[11px] font-mono text-[#737373] bg-[#111111] p-2 rounded border border-[#292929]">
              GET /api/v1/stats?ingame=true
            </div>
          </div>

          <div className="pt-2 border-t border-[#292929]">
            <span className="text-[11px] text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Dedupliziert & Zensiert bereit</span>
            </span>
          </div>
        </div>
      </div>

      {/* Integrations-Protokolle / Sync Logs */}
      <div className="bg-[#161616] border border-[#292929] rounded-[8px] overflow-hidden">
        <div className="p-4 border-b border-[#292929] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#F5F5F5]">Synchronisierungs- & Fehlerprotokolle</h3>
          <span className="text-xs text-[#737373]">{logs.length} Einträge</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] border-b border-[#292929] text-[10px] uppercase font-bold text-[#737373] tracking-wider">
              <tr>
                <th className="py-3 px-4">Zeitpunkt</th>
                <th className="py-3 px-4">Quelle</th>
                <th className="py-3 px-4">Level</th>
                <th className="py-3 px-4">Meldung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#292929]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#737373]">
                    Noch keine Synchronisierungsprotokolle vorhanden.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#1A1A1A] transition">
                    <td className="py-2.5 px-4 text-[#737373] font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleTimeString('de-DE')}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-[#F5F5F5]">{log.source}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          log.level === 'ERROR'
                            ? 'bg-rose-500/20 text-rose-400'
                            : log.level === 'WARN'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-[#A3A3A3] font-mono text-[11px]">
                      {log.message}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
