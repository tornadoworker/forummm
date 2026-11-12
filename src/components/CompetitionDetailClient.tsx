'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Swords,
  Trophy,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  Shield,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Radio,
  FileText,
  Layers,
  Award,
  Crown,
  ChevronRight,
  UserCheck,
  UserMinus
} from 'lucide-react';

interface Participant {
  id: string;
  points: number;
  wins: number;
  losses: number;
  status: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
    role: { displayName: string; color: string };
  };
}

interface Match {
  id: string;
  round: number;
  matchNumber: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  score1: number;
  score2: number;
  resultNotes: string | null;
  scheduledAt: string | null;
  challenger: {
    id: string;
    username: string;
    avatarUrl: string | null;
  } | null;
  challenged: {
    id: string;
    username: string;
    avatarUrl: string | null;
  } | null;
  winner: {
    id: string;
    username: string;
  } | null;
}

interface CompetitionDetailProps {
  competition: {
    id: string;
    title: string;
    slug: string;
    description: string;
    rules: string;
    type: '1V1' | 'TEAM';
    status: 'PLANNED' | 'REGISTRATION_OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    maxParticipants: number;
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
    creator: {
      id: string;
      username: string;
      avatarUrl: string | null;
      role: { displayName: string; color: string };
    };
    participants: Participant[];
    matches: Match[];
  };
  currentUser?: {
    id: string;
    username: string;
    role: { canAccessAdmin: boolean; displayName: string };
  } | null;
}

export default function CompetitionDetailClient({
  competition,
  currentUser,
}: CompetitionDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'rules' | 'participants' | 'bracket' | 'results'>('rules');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isParticipant = Boolean(
    currentUser && competition.participants.some((p) => p.user.id === currentUser.id)
  );

  const canJoin =
    Boolean(currentUser) &&
    competition.status === 'REGISTRATION_OPEN' &&
    !isParticipant &&
    competition.participants.length < competition.maxParticipants;

  const canLeave =
    Boolean(currentUser) &&
    competition.status === 'REGISTRATION_OPEN' &&
    isParticipant;

  const handleJoin = async () => {
    if (!currentUser) return;
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/competitions/${competition.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'JOIN' }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || 'Fehler beim Beitreten.');
      } else {
        setSuccessMsg('Du hast dich erfolgreich für das Turnier angemeldet!');
        router.refresh();
      }
    } catch (e) {
      setErrorMsg('Verbindungsfehler.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeave = async () => {
    if (!currentUser) return;
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/competitions/${competition.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'LEAVE' }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || 'Fehler beim Abmelden.');
      } else {
        setSuccessMsg('Du hast dich vom Turnier abgemeldet.');
        router.refresh();
      }
    } catch (e) {
      setErrorMsg('Verbindungsfehler.');
    } finally {
      setSubmitting(false);
    }
  };

  const participantPercent = Math.min(
    100,
    Math.round((competition.participants.length / competition.maxParticipants) * 100)
  );

  return (
    <div className="space-y-6">
      {/* 1. BREADCRUMB */}
      <div className="flex items-center gap-2 text-xs text-[#A3A3A3]">
        <Link href="/forum" className="hover:text-[#F5F5F5] transition">
          Forum
        </Link>
        <ChevronRight className="w-3 h-3 text-[#555555]" />
        <Link href="/competitions" className="hover:text-[#F5F5F5] transition">
          Wettbewerbe
        </Link>
        <ChevronRight className="w-3 h-3 text-[#555555]" />
        <span className="text-[#F5F5F5] font-medium truncate max-w-xs">{competition.title}</span>
      </div>

      {/* 2. TURNIER HEADER HERO */}
      <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-5 sm:p-7 space-y-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
          <div className="space-y-2.5 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-[4px] bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#8B5CF6] text-[11px] font-bold uppercase tracking-wider">
                {competition.type === '1V1' ? '1v1 Duell Format' : 'Team / Fraktions-Wettbewerb'}
              </span>

              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-[4px] ${
                  competition.status === 'REGISTRATION_OPEN'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : competition.status === 'IN_PROGRESS'
                    ? 'bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/30'
                    : competition.status === 'COMPLETED'
                    ? 'bg-[#222222] text-[#737373]'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                }`}
              >
                {competition.status === 'REGISTRATION_OPEN'
                  ? 'Anmeldung geöffnet'
                  : competition.status === 'IN_PROGRESS'
                  ? 'Läuft aktuell'
                  : competition.status === 'COMPLETED'
                  ? 'Abgeschlossen'
                  : 'Geplant'}
              </span>

              {isParticipant && (
                <span className="px-2.5 py-0.5 rounded-[4px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold flex items-center gap-1">
                  <UserCheck className="w-3 h-3" />
                  Du nimmst teil
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F5F5F5] tracking-tight">
              {competition.title}
            </h1>

            <p className="text-xs sm:text-sm text-[#A3A3A3] leading-relaxed">
              {competition.description}
            </p>

            <div className="pt-2 flex items-center gap-4 text-xs text-[#737373] flex-wrap">
              <span>
                Erstellt von <strong className="text-[#F5F5F5]">{competition.creator.username}</strong>
              </span>
              <span>•</span>
              <span>Erstellt am {new Date(competition.createdAt).toLocaleDateString('de-DE')}</span>
            </div>
          </div>

          {/* Beitritts-Box & Status */}
          <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-4 min-w-[240px] space-y-3 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#737373] flex items-center gap-1.5 font-medium">
                <Users className="w-3.5 h-3.5 text-[#8B5CF6]" />
                Teilnehmer
              </span>
              <span className="font-bold text-[#F5F5F5]">
                {competition.participants.length} / {competition.maxParticipants}
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-[#1A1A1A] overflow-hidden">
              <div
                className="h-full bg-[#8B5CF6] transition-all"
                style={{ width: `${participantPercent}%` }}
              />
            </div>

            {errorMsg && (
              <p className="text-[11px] text-rose-400 bg-rose-950/20 p-2 rounded border border-rose-500/30">
                {errorMsg}
              </p>
            )}

            {successMsg && (
              <p className="text-[11px] text-emerald-400 bg-emerald-950/20 p-2 rounded border border-emerald-500/30">
                {successMsg}
              </p>
            )}

            {canJoin && (
              <button
                onClick={handleJoin}
                disabled={submitting}
                className="w-full h-9 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white rounded-[5px] text-xs font-semibold transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>{submitting ? 'Trete bei...' : 'Am Turnier teilnehmen'}</span>
              </button>
            )}

            {canLeave && (
              <button
                onClick={handleLeave}
                disabled={submitting}
                className="w-full h-8 bg-[#161616] hover:bg-[#222222] text-rose-400 border border-rose-500/30 rounded-[5px] text-xs font-medium transition flex items-center justify-center gap-1.5"
              >
                <UserMinus className="w-3.5 h-3.5" />
                <span>{submitting ? 'Melde ab...' : 'Vom Turnier abmelden'}</span>
              </button>
            )}

            {!currentUser && (
              <Link
                href="/login"
                className="w-full h-9 bg-[#161616] hover:bg-[#1D1D1D] text-[#8B5CF6] border border-[#292929] rounded-[5px] text-xs font-medium transition flex items-center justify-center"
              >
                Anmelden zur Teilnahme
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 3. VORBEREITETER API-HINWEIS */}
      <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-3.5 text-xs text-[#A3A3A3] flex items-start gap-3">
        <Radio className="w-4 h-4 text-[#8B5CF6] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-[#F5F5F5] font-semibold text-xs">
            Integrationsschicht (FiveM API & Discord Bot):
          </p>
          <p className="text-[11px] leading-relaxed text-[#A3A3A3]">
            Die Spielpläne und Teilnehmer werden lokal im Forum gepflegt. Automatische Ingame-Ergebnisübermittlung und Discord-Pings bleiben bis zur Verknüpfung des FiveM-Gameservers deaktiviert. Match-Ergebnisse können nach Freischaltung über die Schnittstelle <code>/api/v1/competitions</code> eingespielt werden.
          </p>
        </div>
      </div>

      {/* 4. TABS NAVIGATION */}
      <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-1.5 flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('rules')}
          className={`h-8 px-4 rounded-[5px] text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'rules'
              ? 'bg-[#8B5CF6] text-white shadow-sm'
              : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Regelwerk & Übersicht</span>
        </button>

        <button
          onClick={() => setActiveTab('participants')}
          className={`h-8 px-4 rounded-[5px] text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'participants'
              ? 'bg-[#8B5CF6] text-white shadow-sm'
              : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Teilnehmer & Rangliste ({competition.participants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bracket')}
          className={`h-8 px-4 rounded-[5px] text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'bracket'
              ? 'bg-[#8B5CF6] text-white shadow-sm'
              : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Turnierbaum & Spielplan</span>
        </button>

        <button
          onClick={() => setActiveTab('results')}
          className={`h-8 px-4 rounded-[5px] text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'results'
              ? 'bg-[#8B5CF6] text-white shadow-sm'
              : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Ergebnisse & Matches ({competition.matches.length})</span>
        </button>
      </div>

      {/* 5. TAB-INHALTE */}
      {activeTab === 'rules' && (
        <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-6 space-y-6">
          <div className="space-y-3">
            <h3 className="text-base font-bold text-[#F5F5F5] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#8B5CF6]" />
              Offizielles Turnier-Regelwerk
            </h3>
            <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-4 text-xs text-[#A3A3A3] leading-relaxed whitespace-pre-wrap font-sans">
              {competition.rules}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#737373]">Turniermodus</span>
              <p className="text-sm font-semibold text-[#F5F5F5]">
                {competition.type === '1V1' ? '1 gegen 1 K.O.-Duell' : 'Team-Elimination'}
              </p>
            </div>

            <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#737373]">Max. Teilnehmer</span>
              <p className="text-sm font-semibold text-[#F5F5F5]">
                {competition.maxParticipants} Plätze
              </p>
            </div>

            <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#737373]">Schiedsgericht</span>
              <p className="text-sm font-semibold text-[#8B5CF6]">
                Vega Crimelife Team
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'participants' && (
        <div className="bg-[#161616] border border-[#292929] rounded-[8px] overflow-hidden">
          <div className="p-4 border-b border-[#292929] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#F5F5F5]">
              Angemeldete Schützen & Punkte
            </h3>
            <span className="text-xs text-[#737373]">
              {competition.participants.length} von {competition.maxParticipants} Plätzen belegt
            </span>
          </div>

          {competition.participants.length === 0 ? (
            <div className="p-10 text-center text-xs text-[#737373] space-y-2">
              <Users className="w-8 h-8 mx-auto text-[#555555]" />
              <p className="font-semibold text-[#F5F5F5]">Noch keine Teilnehmer registriert</p>
              <p>Nutze den Button oben, um der erste Schütze in diesem Wettbewerb zu werden!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#111111] border-b border-[#292929] text-[10px] uppercase font-bold text-[#737373] tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Spieler</th>
                    <th className="py-3 px-4 text-right">Punkte</th>
                    <th className="py-3 px-4 text-right">Siege</th>
                    <th className="py-3 px-4 text-right">Niederlagen</th>
                    <th className="py-3 px-4 text-right">Angemeldet am</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#292929]">
                  {competition.participants.map((p, index) => (
                    <tr key={p.id} className="hover:bg-[#1A1A1A] transition">
                      <td className="py-3.5 px-4 text-center font-bold text-[#737373]">
                        #{index + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-[4px] bg-[#111111] border border-[#292929] flex items-center justify-center font-bold text-[#8B5CF6] text-xs">
                            {p.user.username.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-[#F5F5F5] block">
                              {p.user.username}
                            </span>
                            <span
                              className="text-[10px] font-medium"
                              style={{ color: p.user.role.color }}
                            >
                              {p.user.role.displayName}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#8B5CF6]">
                        {p.points} Pkt
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-400 font-medium">
                        {p.wins}
                      </td>
                      <td className="py-3.5 px-4 text-right text-rose-400 font-medium">
                        {p.losses}
                      </td>
                      <td className="py-3.5 px-4 text-right text-[#737373]">
                        {new Date(p.createdAt).toLocaleDateString('de-DE')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'bracket' && (
        <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#292929]">
            <div>
              <h3 className="text-sm font-bold text-[#F5F5F5]">Turnierbaum & Spielplan</h3>
              <p className="text-xs text-[#A3A3A3] mt-0.5">
                Vorbereitete K.O.-Bracket-Übersicht für das Turnier
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-[4px] bg-[#111111] border border-[#292929] text-[11px] text-[#8B5CF6] font-medium">
              Single-Elimination
            </span>
          </div>

          {/* BRACKET VISUALISIERUNG */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Runde 1: Viertelfinale */}
            <div className="space-y-4">
              <div className="text-[11px] uppercase font-bold text-[#737373] tracking-wider text-center">
                Viertelfinale
              </div>
              <div className="space-y-3">
                {[1, 2].map((matchNum) => (
                  <div
                    key={matchNum}
                    className="bg-[#111111] border border-[#292929] rounded-[6px] p-3 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-[#737373] text-[10px]">
                      <span>Match #{matchNum}</span>
                      <span>Ausstehend</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between p-1.5 rounded bg-[#161616] text-[#F5F5F5]">
                        <span>{competition.participants[matchNum * 2 - 2]?.user.username || `Schütze #${matchNum * 2 - 1}`}</span>
                        <span className="font-mono text-[#737373]">–</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded bg-[#161616] text-[#F5F5F5]">
                        <span>{competition.participants[matchNum * 2 - 1]?.user.username || `Schütze #${matchNum * 2}`}</span>
                        <span className="font-mono text-[#737373]">–</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Runde 2: Halbfinale */}
            <div className="space-y-4">
              <div className="text-[11px] uppercase font-bold text-[#737373] tracking-wider text-center">
                Halbfinale
              </div>
              <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#737373] text-[10px]">
                  <span>Halbfinale #1</span>
                  <span>Nach R1</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between p-1.5 rounded bg-[#161616] text-[#A3A3A3]">
                    <span>Sieger Match #1</span>
                    <span className="font-mono text-[#737373]">–</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-[#161616] text-[#A3A3A3]">
                    <span>Sieger Match #2</span>
                    <span className="font-mono text-[#737373]">–</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Runde 3: Finale */}
            <div className="space-y-4">
              <div className="text-[11px] uppercase font-bold text-amber-400 tracking-wider text-center flex items-center justify-center gap-1">
                <Crown className="w-3.5 h-3.5" />
                <span>Finale & Meisterschaft</span>
              </div>
              <div className="bg-gradient-to-b from-[#8B5CF6]/15 to-[#111111] border-2 border-[#8B5CF6]/50 rounded-[6px] p-4 space-y-3 text-xs shadow-lg">
                <div className="flex items-center justify-between text-[#8B5CF6] text-[10px] font-bold">
                  <span>Grand Final</span>
                  <span>Trophy Match</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between p-2 rounded bg-[#161616] text-[#F5F5F5] font-semibold">
                    <span>Finalist A</span>
                    <span className="font-mono text-amber-400">0</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-[#161616] text-[#F5F5F5] font-semibold">
                    <span>Finalist B</span>
                    <span className="font-mono text-amber-400">0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'results' && (
        <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
            <h3 className="text-sm font-bold text-[#F5F5F5]">Bestätigte Spielergebnisse</h3>
            <span className="text-xs text-[#737373]">{competition.matches.length} Matches registriert</span>
          </div>

          {competition.matches.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#737373] space-y-1">
              <Clock className="w-7 h-7 mx-auto text-[#555555] mb-2" />
              <p className="font-semibold text-[#F5F5F5]">Noch keine ausgetragenen Matches</p>
              <p>Sobald das Turnier startet, erscheinen die Runden und K/D-Ergebnisse hier.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {competition.matches.map((m) => (
                <div
                  key={m.id}
                  className="bg-[#111111] border border-[#292929] rounded-[6px] p-3 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[#8B5CF6] font-bold">Runde {m.round}</span>
                    <span className="text-[#F5F5F5]">{m.challenger?.username || 'TBD'}</span>
                    <span className="text-[#737373]">vs</span>
                    <span className="text-[#F5F5F5]">{m.challenged?.username || 'TBD'}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-amber-400">
                      {m.score1} : {m.score2}
                    </span>
                    {m.winner && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">
                        Sieger: {m.winner.username}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
