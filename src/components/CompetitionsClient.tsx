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
  Plus,
  Shield,
  ArrowRight,
  AlertCircle,
  X,
  Send,
  Check,
  Ban,
  ChevronRight,
  Flame,
  Radio
} from 'lucide-react';

interface CompetitionItem {
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
  _count: {
    participants: number;
    matches: number;
  };
}

interface DirectMatchItem {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  score1: number;
  score2: number;
  resultNotes: string | null;
  createdAt: string;
  challenger: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  challenged: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  winner: {
    id: string;
    username: string;
  } | null;
}

interface CompetitionsClientProps {
  initialCompetitions: CompetitionItem[];
  initialDirectMatches: DirectMatchItem[];
  currentUser?: {
    id: string;
    username: string;
    role: { canAccessAdmin: boolean; displayName: string };
  } | null;
}

export default function CompetitionsClient({
  initialCompetitions,
  initialDirectMatches,
  currentUser,
}: CompetitionsClientProps) {
  const router = useRouter();
  const [competitions, setCompetitions] = useState<CompetitionItem[]>(initialCompetitions);
  const [directMatches, setDirectMatches] = useState<DirectMatchItem[]>(initialDirectMatches);
  const [typeFilter, setTypeFilter] = useState<'ALL' | '1V1' | 'TEAM'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'REGISTRATION_OPEN' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');

  // Modals
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [opponentName, setOpponentName] = useState('');
  const [challengeNote, setChallengeNote] = useState('');
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    rules: '',
    type: '1V1' as '1V1' | 'TEAM',
    maxParticipants: 16,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1v1 Challenge senden
  const handleSendChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CHALLENGE_PLAYER',
          targetUsername: opponentName.trim(),
          notes: challengeNote.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || 'Fehler beim Senden der Herausforderung.');
      } else {
        setDirectMatches((prev) => [json.match, ...prev]);
        setSuccessMsg(`Herausforderung an ${opponentName} erfolgreich verschickt!`);
        setOpponentName('');
        setChallengeNote('');
        setTimeout(() => {
          setChallengeModalOpen(false);
          setSuccessMsg('');
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg('Verbindungsfehler.');
    } finally {
      setSubmitting(false);
    }
  };

  // 1v1 Challenge antworten
  const handleRespondChallenge = async (matchId: string, accept: boolean) => {
    try {
      const res = await fetch('/api/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESPOND_CHALLENGE',
          matchId,
          accept,
        }),
      });

      if (res.ok) {
        setDirectMatches((prev) =>
          prev.map((m) =>
            m.id === matchId ? { ...m, status: accept ? 'ACCEPTED' : 'REJECTED' } : m
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Turnier erstellen
  const handleCreateCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_COMPETITION',
          ...createForm,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || 'Fehler beim Erstellen.');
      } else {
        setCompetitions((prev) => [
          {
            ...json.competition,
            creator: {
              id: currentUser.id,
              username: currentUser.username,
              avatarUrl: null,
              role: { displayName: currentUser.role.displayName, color: '#8B5CF6' },
            },
            _count: { participants: 0, matches: 0 },
          },
          ...prev,
        ]);
        setCreateModalOpen(false);
        setCreateForm({
          title: '',
          description: '',
          rules: '',
          type: '1V1',
          maxParticipants: 16,
        });
        router.refresh();
      }
    } catch (err) {
      setErrorMsg('Verbindungsfehler.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filterung der Turniere
  const filteredCompetitions = competitions.filter((c) => {
    if (typeFilter !== 'ALL' && c.type !== typeFilter) return false;
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. SEITEN-HEADER */}
      <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="h-6 px-2.5 rounded-[4px] bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/30 text-[11px] font-semibold flex items-center gap-1.5 uppercase tracking-wide">
              <Swords className="w-3 h-3" />
              Wettbewerbe & Turniere
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F5F5F5] tracking-tight">
            Vega CrimeLife Wettbewerbe
          </h1>
          <p className="text-xs sm:text-sm text-[#A3A3A3] max-w-2xl">
            1v1 Duelle, Fraktions-Turniere und Ranglisten-Matches. Fordere andere Spieler heraus oder tritt großen Turnieren bei.
          </p>
        </div>

        {/* Aktionsbuttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {currentUser && (
            <button
              onClick={() => {
                setErrorMsg('');
                setSuccessMsg('');
                setChallengeModalOpen(true);
              }}
              className="h-9 px-4 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-medium rounded-[6px] transition flex items-center gap-2 shadow-sm"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>1v1 Duell fordern</span>
            </button>
          )}

          {currentUser?.role?.canAccessAdmin && (
            <button
              onClick={() => {
                setErrorMsg('');
                setCreateModalOpen(true);
              }}
              className="h-9 px-3.5 bg-[#111111] hover:bg-[#1D1D1D] text-[#F5F5F5] border border-[#292929] text-xs font-medium rounded-[6px] transition flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>Turnier erstellen</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. SCHNITTSTELLEN-HINWEIS (HONEST INTEGRATION NOTICE) */}
      <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-4 text-xs text-[#A3A3A3] flex items-start gap-3">
        <Radio className="w-4 h-4 text-[#8B5CF6] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-[#F5F5F5] font-semibold text-xs">
            Hinweis zur automatisierten Ingame- & Discord-Anbindung:
          </p>
          <p className="leading-relaxed text-[11px] text-[#A3A3A3]">
            Turnier-Teilnahmen, 1v1-Herausforderungen und Spielpläne funktionieren bereits vollständig im Forum. 
            Die automatische Echtzeit-Ergebnisübermittlung von Match-Statistiken über die FiveM API und automatische Discord-Bot-Pings bleiben bis zur Konfiguration der Server-Schlüssel im gesicherten Standby-Zustand.
          </p>
        </div>
      </div>

      {/* 3. 1V1 DIREKT-DUELLE SEKTION */}
      <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-[#F5F5F5]">Aktuelle 1v1 Duell-Herausforderungen</h3>
          </div>
          <span className="text-[11px] text-[#737373]">{directMatches.length} Duelle gelistet</span>
        </div>

        {directMatches.length === 0 ? (
          <div className="text-center py-6 text-xs text-[#737373]">
            Noch keine aktiven 1v1 Duelle. Klicke oben auf &bdquo;1v1 Duell fordern&ldquo;, um einen Spieler herauszufordern!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {directMatches.slice(0, 6).map((match) => {
              const isChallengedUser = currentUser && currentUser.id === match.challenged.id;
              const isChallengerUser = currentUser && currentUser.id === match.challenger.id;

              return (
                <div
                  key={match.id}
                  className="bg-[#111111] border border-[#292929] rounded-[6px] p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#737373] tracking-wider">
                      1v1 Duell
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-[4px] ${
                        match.status === 'ACCEPTED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : match.status === 'PENDING'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : match.status === 'COMPLETED'
                          ? 'bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/30'
                          : 'bg-[#222222] text-[#737373]'
                      }`}
                    >
                      {match.status === 'ACCEPTED'
                        ? 'Angenommen'
                        : match.status === 'PENDING'
                        ? 'Ausstehend'
                        : match.status === 'COMPLETED'
                        ? 'Beendet'
                        : 'Abgelehnt'}
                    </span>
                  </div>

                  {/* Spieler Gegenüberstellung */}
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-[4px] bg-[#161616] border border-[#292929] flex items-center justify-center font-bold text-[#8B5CF6] text-xs shrink-0">
                        {match.challenger.username.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-semibold text-[#F5F5F5] truncate">
                        {match.challenger.username}
                      </span>
                    </div>

                    <span className="text-[11px] font-bold text-[#8B5CF6] shrink-0">VS</span>

                    <div className="flex items-center gap-2 min-w-0 justify-end">
                      <span className="font-semibold text-[#F5F5F5] truncate">
                        {match.challenged.username}
                      </span>
                      <div className="w-7 h-7 rounded-[4px] bg-[#161616] border border-[#292929] flex items-center justify-center font-bold text-amber-400 text-xs shrink-0">
                        {match.challenged.username.substring(0, 2).toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {match.resultNotes && (
                    <p className="text-[11px] text-[#A3A3A3] bg-[#161616] px-2.5 py-1.5 rounded-[4px] border border-[#292929] italic">
                      &bdquo;{match.resultNotes}&ldquo;
                    </p>
                  )}

                  {/* Aktionen bei PENDING */}
                  {match.status === 'PENDING' && isChallengedUser && (
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#292929]">
                      <button
                        onClick={() => handleRespondChallenge(match.id, false)}
                        className="h-7 px-2.5 bg-[#161616] hover:bg-[#222222] text-rose-400 border border-rose-500/30 rounded-[4px] text-[11px] font-medium transition flex items-center gap-1"
                      >
                        <Ban className="w-3 h-3" />
                        <span>Ablehnen</span>
                      </button>
                      <button
                        onClick={() => handleRespondChallenge(match.id, true)}
                        className="h-7 px-3 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white rounded-[4px] text-[11px] font-medium transition flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Annehmen</span>
                      </button>
                    </div>
                  )}

                  {match.status === 'PENDING' && isChallengerUser && (
                    <div className="text-[10px] text-amber-400/80 pt-1 border-t border-[#292929]">
                      Wartet auf Rückmeldung des Gegners...
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. TURNIER-ÜBERSICHT MIT FILTERN */}
      <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-5 space-y-5">
        {/* Filter Leiste */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-4 border-b border-[#292929]">
          <div className="flex items-center gap-1.5 bg-[#111111] p-1 rounded-[6px] border border-[#292929] text-xs">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`h-7 px-3 rounded-[4px] font-medium transition ${
                typeFilter === 'ALL'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-[#737373] hover:text-[#F5F5F5]'
              }`}
            >
              Alle Formate
            </button>
            <button
              onClick={() => setTypeFilter('1V1')}
              className={`h-7 px-3 rounded-[4px] font-medium transition ${
                typeFilter === '1V1'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-[#737373] hover:text-[#F5F5F5]'
              }`}
            >
              1v1 Duelle
            </button>
            <button
              onClick={() => setTypeFilter('TEAM')}
              className={`h-7 px-3 rounded-[4px] font-medium transition ${
                typeFilter === 'TEAM'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-[#737373] hover:text-[#F5F5F5]'
              }`}
            >
              Team-Turniere
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-[#111111] p-1 rounded-[6px] border border-[#292929] text-[11px]">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`h-7 px-2.5 rounded-[4px] font-medium transition ${
                statusFilter === 'ALL'
                  ? 'bg-[#1D1D1D] text-[#8B5CF6]'
                  : 'text-[#737373] hover:text-[#F5F5F5]'
              }`}
            >
              Alle Status
            </button>
            <button
              onClick={() => setStatusFilter('REGISTRATION_OPEN')}
              className={`h-7 px-2.5 rounded-[4px] font-medium transition ${
                statusFilter === 'REGISTRATION_OPEN'
                  ? 'bg-[#1D1D1D] text-emerald-400'
                  : 'text-[#737373] hover:text-[#F5F5F5]'
              }`}
            >
              Offen
            </button>
            <button
              onClick={() => setStatusFilter('IN_PROGRESS')}
              className={`h-7 px-2.5 rounded-[4px] font-medium transition ${
                statusFilter === 'IN_PROGRESS'
                  ? 'bg-[#1D1D1D] text-[#8B5CF6]'
                  : 'text-[#737373] hover:text-[#F5F5F5]'
              }`}
            >
              Läuft
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETED')}
              className={`h-7 px-2.5 rounded-[4px] font-medium transition ${
                statusFilter === 'COMPLETED'
                  ? 'bg-[#1D1D1D] text-[#A3A3A3]'
                  : 'text-[#737373] hover:text-[#F5F5F5]'
              }`}
            >
              Abgeschlossen
            </button>
          </div>
        </div>

        {/* Turnier-Karten Grid */}
        {filteredCompetitions.length === 0 ? (
          <div className="text-center py-12 text-xs text-[#737373] space-y-2">
            <Trophy className="w-8 h-8 text-[#555555] mx-auto" />
            <p className="font-semibold text-[#F5F5F5]">Keine Wettbewerbe in dieser Ansicht</p>
            <p>Es sind aktuell keine Wettbewerbe mit diesen Filtern aktiv.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCompetitions.map((comp) => {
              const participantPercent = Math.min(
                100,
                Math.round((comp._count.participants / comp.maxParticipants) * 100)
              );

              return (
                <Link
                  key={comp.id}
                  href={`/competitions/${comp.slug || comp.id}`}
                  className="bg-[#111111] hover:bg-[#161616] border border-[#292929] hover:border-[#8B5CF6]/50 rounded-[8px] p-5 transition flex flex-col justify-between group space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-[#161616] border border-[#292929] text-[#8B5CF6] uppercase">
                        {comp.type === '1V1' ? '1v1 Duell' : 'Team Wettbewerb'}
                      </span>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-[4px] ${
                          comp.status === 'REGISTRATION_OPEN'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : comp.status === 'IN_PROGRESS'
                            ? 'bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/30'
                            : comp.status === 'COMPLETED'
                            ? 'bg-[#222222] text-[#737373]'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {comp.status === 'REGISTRATION_OPEN'
                          ? 'Anmeldung offen'
                          : comp.status === 'IN_PROGRESS'
                          ? 'Läuft'
                          : comp.status === 'COMPLETED'
                          ? 'Beendet'
                          : 'Geplant'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-[#F5F5F5] group-hover:text-[#8B5CF6] transition">
                        {comp.title}
                      </h3>
                      <p className="text-xs text-[#A3A3A3] line-clamp-2 mt-1 leading-relaxed">
                        {comp.description}
                      </p>
                    </div>
                  </div>

                  {/* Teilnehmer-Fortschritt & Footer */}
                  <div className="space-y-2 pt-2 border-t border-[#292929]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#737373] flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Teilnehmer
                      </span>
                      <span className="font-semibold text-[#F5F5F5]">
                        {comp._count.participants} / {comp.maxParticipants}
                      </span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-[#1A1A1A] overflow-hidden">
                      <div
                        className="h-full bg-[#8B5CF6] transition-all"
                        style={{ width: `${participantPercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 text-[11px] text-[#737373]">
                      <span>Erstellt von {comp.creator.username}</span>
                      <span className="text-[#8B5CF6] group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                        Details <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: 1v1 HERAUSFORDERUNG SENDEN */}
      {challengeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161616] border border-[#292929] rounded-[8px] max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-[#8B5CF6]" />
                <h3 className="text-sm font-bold text-[#F5F5F5]">1v1 Duell herausfordern</h3>
              </div>
              <button
                onClick={() => setChallengeModalOpen(false)}
                className="text-[#737373] hover:text-[#F5F5F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSendChallenge} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#A3A3A3] mb-1 font-medium">
                  Gegner Benutzername:
                </label>
                <input
                  type="text"
                  required
                  placeholder="z. B. Vega_Demon"
                  value={opponentName}
                  onChange={(e) => setOpponentName(e.target.value)}
                  className="w-full h-9 px-3 bg-[#111111] border border-[#292929] rounded-[6px] text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div>
                <label className="block text-[#A3A3A3] mb-1 font-medium">
                  Bedingungen / Notiz (optional):
                </label>
                <input
                  type="text"
                  placeholder="z. B. Heavy Pistol, Best of 5, Flughafen Arena"
                  value={challengeNote}
                  onChange={(e) => setChallengeNote(e.target.value)}
                  className="w-full h-9 px-3 bg-[#111111] border border-[#292929] rounded-[6px] text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setChallengeModalOpen(false)}
                  className="h-8 px-3.5 bg-[#111111] hover:bg-[#1D1D1D] text-[#A3A3A3] rounded-[5px] border border-[#292929]"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-8 px-4 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white rounded-[5px] font-medium flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  <span>{submitting ? 'Verschicken...' : 'Duell fordern'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TURNIER ERSTELLEN (ADMIN / STAFF) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161616] border border-[#292929] rounded-[8px] max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#8B5CF6]" />
                <h3 className="text-sm font-bold text-[#F5F5F5]">Neuen Wettbewerb anlegen</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-[#737373] hover:text-[#F5F5F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateCompetition} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#A3A3A3] mb-1 font-medium">Turniertitel:</label>
                <input
                  type="text"
                  required
                  placeholder="z. B. Vega CrimeLife Spring Shootout 2026"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full h-9 px-3 bg-[#111111] border border-[#292929] rounded-[6px] text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A3A3A3] mb-1 font-medium">Format:</label>
                  <select
                    value={createForm.type}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, type: e.target.value as '1V1' | 'TEAM' })
                    }
                    className="w-full h-9 px-3 bg-[#111111] border border-[#292929] rounded-[6px] text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="1V1">1v1 Duell Format</option>
                    <option value="TEAM">Team / Fraktions-Wettbewerb</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#A3A3A3] mb-1 font-medium">
                    Max. Teilnehmer:
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="64"
                    value={createForm.maxParticipants}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        maxParticipants: parseInt(e.target.value) || 16,
                      })
                    }
                    className="w-full h-9 px-3 bg-[#111111] border border-[#292929] rounded-[6px] text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#A3A3A3] mb-1 font-medium">Beschreibung:</label>
                <textarea
                  rows={2}
                  placeholder="Kurze Übersicht über das Turnier..."
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, description: e.target.value })
                  }
                  className="w-full p-2.5 bg-[#111111] border border-[#292929] rounded-[6px] text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div>
                <label className="block text-[#A3A3A3] mb-1 font-medium">Regelwerk:</label>
                <textarea
                  rows={3}
                  placeholder="Erlaubte Waffen, Rundenanzahl, Disqualifikationsregeln..."
                  value={createForm.rules}
                  onChange={(e) => setCreateForm({ ...createForm, rules: e.target.value })}
                  className="w-full p-2.5 bg-[#111111] border border-[#292929] rounded-[6px] text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="h-8 px-3.5 bg-[#111111] hover:bg-[#1D1D1D] text-[#A3A3A3] rounded-[5px] border border-[#292929]"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-8 px-4 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white rounded-[5px] font-medium flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Erstelle...' : 'Turnier anlegen'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
