import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import LiveServerStatusBar from '@/components/LiveServerStatusBar';
import { formatTimeAgo } from '@/lib/utils';
import {
  MessageSquare,
  Gamepad2,
  FileText,
  LifeBuoy,
  Users,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Shield,
  Layers,
  Clock,
  Pin,
  Crosshair,
  Swords
} from 'lucide-react';

export const revalidate = 0;

export default async function WelcomeHomePage() {
  const [
    currentUser,
    recentThreads,
    activeMembers,
    totalThreads,
    totalPosts,
    totalUsers,
    latestUser,
  ] = await Promise.all([
    getCurrentUser(),
    prisma.thread.findMany({
      where: { isDeleted: false },
      include: {
        author: { include: { role: true } },
        forum: true,
        prefix: true,
        _count: { select: { posts: true } },
      },
      orderBy: { lastActivityAt: 'desc' },
      take: 6,
    }),
    prisma.user.findMany({
      where: { isBanned: false },
      include: { role: true },
      orderBy: { lastActiveAt: 'desc' },
      take: 12,
    }),
    prisma.thread.count({ where: { isDeleted: false } }),
    prisma.post.count({ where: { isDeleted: false } }),
    prisma.user.count(),
    prisma.user.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { role: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* 1. WILLKOMMENSBEREICH (KOMPAKTER COMMUNITY HERO) */}
      <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-6 sm:p-7 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 min-h-[180px]">
        <div className="space-y-4 z-10 max-w-2xl flex-1">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-[4px] bg-[#111111] border border-[#292929] text-[11px] text-[#8B5CF6] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]"></span>
              <span>Offizielles Community Portal</span>
            </div>

            <h1 className="text-[26px] sm:text-[28px] font-bold text-[#F5F5F5] tracking-tight">
              Willkommen bei <span className="text-[#8B5CF6]">Vega Crimelife</span>
            </h1>

            <p className="text-sm text-[#A3A3A3] leading-relaxed">
              Deine offizielle Community-Plattform für unser deutsches GTA V FiveM Roleplay-Netzwerk. 
              Tausche dich im Forum aus, informiere dich über Updates oder schließe dich unserem FiveM-Server an.
            </p>
          </div>

          {/* Schnelle Aktions-Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Link
              href="/forum"
              className="h-9 px-4 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-[13px] font-medium rounded-[6px] transition inline-flex items-center gap-2 shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Zum Forum</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <a
              href="fivem://connect/play.vega-crimelife.de"
              className="h-9 px-4 bg-[#111111] hover:bg-[#1D1D1D] text-[#F5F5F5] text-[13px] font-medium rounded-[6px] border border-[#292929] transition inline-flex items-center gap-2"
            >
              <Gamepad2 className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>Server beitreten</span>
            </a>

            <Link
              href="/rules"
              className="h-9 px-3.5 bg-[#111111] hover:bg-[#1D1D1D] text-[#A3A3A3] hover:text-[#F5F5F5] text-[13px] font-medium rounded-[6px] border border-[#292929] transition inline-flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Regelwerk</span>
            </Link>

            <Link
              href="/support"
              className="h-9 px-3.5 bg-[#111111] hover:bg-[#1D1D1D] text-[#A3A3A3] hover:text-[#F5F5F5] text-[13px] font-medium rounded-[6px] border border-[#292929] transition inline-flex items-center gap-1.5"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>Support</span>
            </Link>
          </div>
        </div>

        {/* Offizielles Vega Logo rechts im Hero-Bereich */}
        <div className="relative z-10 shrink-0 flex items-center justify-center md:pr-4">
          <img
            src="/logo.png"
            alt="Vega Crimelife Logo"
            className="h-[130px] sm:h-[155px] w-auto object-contain drop-shadow-[0_0_25px_rgba(139,92,246,0.35)]"
          />
        </div>
      </div>

      {/* 2. SERVER STATUSLEISTE */}
      <LiveServerStatusBar defaultAddress="play.vega-crimelife.de" />

      {/* 3. WILLKOMMEN SCHNELLEINSTIEG (6 BEREICHE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/forum"
          className="group bg-[#161616] hover:bg-[#1D1D1D] border border-[#292929] hover:border-[#8B5CF6]/50 rounded-[6px] p-4 transition flex flex-col justify-between space-y-2"
        >
          <div className="space-y-1.5">
            <div className="w-7 h-7 rounded-[5px] bg-[#111111] border border-[#292929] flex items-center justify-center text-[#8B5CF6]">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-[13px] font-semibold text-[#F5F5F5] group-hover:text-[#8B5CF6] transition">
              Community Forum
            </h3>
            <p className="text-[12px] text-[#A3A3A3] leading-relaxed">
              Tausche dich mit Spielern aus, lies Ankündigungen und reiche Vorschläge ein.
            </p>
          </div>
          <div className="pt-2 text-[11px] text-[#8B5CF6] font-medium flex items-center gap-1">
            <span>Foren ansehen</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        <Link
          href="/stats"
          className="group bg-[#161616] hover:bg-[#1D1D1D] border border-[#292929] hover:border-[#8B5CF6]/50 rounded-[6px] p-4 transition flex flex-col justify-between space-y-2"
        >
          <div className="space-y-1.5">
            <div className="w-7 h-7 rounded-[5px] bg-[#111111] border border-[#292929] flex items-center justify-center text-[#8B5CF6]">
              <Crosshair className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-[13px] font-semibold text-[#F5F5F5] group-hover:text-[#8B5CF6] transition">
              Live-Statistik & Ranglisten
            </h3>
            <p className="text-[12px] text-[#A3A3A3] leading-relaxed">
              Bestätigte Kills, K/D-Ratios, Bester Shooter und Fraktionswertungen im Überblick.
            </p>
          </div>
          <div className="pt-2 text-[11px] text-[#8B5CF6] font-medium flex items-center gap-1">
            <span>Ranglisten ansehen</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        <Link
          href="/competitions"
          className="group bg-[#161616] hover:bg-[#1D1D1D] border border-[#292929] hover:border-amber-500/50 rounded-[6px] p-4 transition flex flex-col justify-between space-y-2"
        >
          <div className="space-y-1.5">
            <div className="w-7 h-7 rounded-[5px] bg-[#111111] border border-[#292929] flex items-center justify-center text-amber-400">
              <Swords className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-[13px] font-semibold text-[#F5F5F5] group-hover:text-amber-400 transition">
              Wettbewerbe & 1v1 Duelle
            </h3>
            <p className="text-[12px] text-[#A3A3A3] leading-relaxed">
              Fordere Rivalen heraus, nimm an Turnieren teil und verfolge Spielpläne.
            </p>
          </div>
          <div className="pt-2 text-[11px] text-amber-400 font-medium flex items-center gap-1">
            <span>Duelle & Turniere</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        <Link
          href="/rules"
          className="group bg-[#161616] hover:bg-[#1D1D1D] border border-[#292929] hover:border-[#8B5CF6]/50 rounded-[6px] p-4 transition flex flex-col justify-between space-y-2"
        >
          <div className="space-y-1.5">
            <div className="w-7 h-7 rounded-[5px] bg-[#111111] border border-[#292929] flex items-center justify-center text-[#8B5CF6]">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-[13px] font-semibold text-[#F5F5F5] group-hover:text-[#8B5CF6] transition">
              Server Regelwerk
            </h3>
            <p className="text-[12px] text-[#A3A3A3] leading-relaxed">
              Das Fundament für faires Roleplay: Verhaltensregeln, RP-Begriffe und Richtlinien.
            </p>
          </div>
          <div className="pt-2 text-[11px] text-[#8B5CF6] font-medium flex items-center gap-1">
            <span>Regeln lesen</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        <Link
          href="/support"
          className="group bg-[#161616] hover:bg-[#1D1D1D] border border-[#292929] hover:border-[#8B5CF6]/50 rounded-[6px] p-4 transition flex flex-col justify-between space-y-2"
        >
          <div className="space-y-1.5">
            <div className="w-7 h-7 rounded-[5px] bg-[#111111] border border-[#292929] flex items-center justify-center text-[#8B5CF6]">
              <LifeBuoy className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-[13px] font-semibold text-[#F5F5F5] group-hover:text-[#8B5CF6] transition">
              Support Tickets
            </h3>
            <p className="text-[12px] text-[#A3A3A3] leading-relaxed">
              Schnelle Unterstützung bei technischen Anliegen, Fragen oder Entbannungsanträgen.
            </p>
          </div>
          <div className="pt-2 text-[11px] text-[#8B5CF6] font-medium flex items-center gap-1">
            <span>Ticket eröffnen</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        <Link
          href="/members"
          className="group bg-[#161616] hover:bg-[#1D1D1D] border border-[#292929] hover:border-[#8B5CF6]/50 rounded-[6px] p-4 transition flex flex-col justify-between space-y-2"
        >
          <div className="space-y-1.5">
            <div className="w-7 h-7 rounded-[5px] bg-[#111111] border border-[#292929] flex items-center justify-center text-[#8B5CF6]">
              <Users className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-[13px] font-semibold text-[#F5F5F5] group-hover:text-[#8B5CF6] transition">
              Mitglieder & Team
            </h3>
            <p className="text-[12px] text-[#A3A3A3] leading-relaxed">
              Finde Mitspieler, schau dir Profile an und lerne das Server-Team kennen.
            </p>
          </div>
          <div className="pt-2 text-[11px] text-[#8B5CF6] font-medium flex items-center gap-1">
            <span>Mitglieder ansehen</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </div>

      {/* 4. ZWEISPALTIGES LAYOUT: AKTUELLES & SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* HAUPTINHALT (72% -> 8.5 / 12 Spalten) */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-5">
          {/* Neueste Diskussionen aus der Community */}
          <div className="bg-[#161616] border border-[#292929] rounded-[6px] overflow-hidden">
            <div className="bg-[#111111] px-4 py-2.5 border-b border-[#292929] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-[#8B5CF6]" />
                <h2 className="text-[14px] font-semibold text-[#F5F5F5]">
                  Aktuelle Themen aus dem Forum
                </h2>
              </div>
              <Link
                href="/forum"
                className="text-[12px] text-[#8B5CF6] hover:text-[#A78BFA] transition font-medium"
              >
                Zum gesamten Forum
              </Link>
            </div>

            {recentThreads.length > 0 ? (
              <div className="divide-y divide-[#292929]">
                {recentThreads.map((thread) => (
                  <div
                    key={thread.id}
                    className="p-3.5 hover:bg-[#1D1D1D] transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 space-y-0.5 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {thread.prefix && (
                          <span className="px-1.5 py-0.2 rounded-[4px] text-[10px] font-semibold bg-[#111111] text-[#8B5CF6] border border-[#292929]">
                            {thread.prefix.name}
                          </span>
                        )}
                        <Link
                          href={`/forum/thread/${thread.id}`}
                          className="font-medium text-[13px] text-[#F5F5F5] hover:text-[#8B5CF6] transition truncate"
                        >
                          {thread.title}
                        </Link>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#737373]">
                        <span className="text-[#A3A3A3]">{thread.forum.name}</span>
                        <span>•</span>
                        <span>von {thread.author.username}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(thread.createdAt)}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 text-[11px] text-[#A3A3A3]">
                      <span className="font-semibold text-[#F5F5F5]">{thread._count.posts}</span>
                      <span className="text-[10px] text-[#737373] ml-1">Antworten</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 text-center space-y-1">
                <p className="text-[13px] font-medium text-[#F5F5F5]">
                  Noch keine Beiträge vorhanden
                </p>
                <p className="text-[12px] text-[#737373]">
                  Sobald im Forum Themen erstellt werden, erscheinen sie hier direkt auf der Startseite.
                </p>
              </div>
            )}
          </div>

          {/* Über Vega Crimelife Feature-Grid */}
          <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-5 space-y-3.5">
            <div className="border-b border-[#292929] pb-2">
              <h3 className="text-[14px] font-semibold text-[#F5F5F5]">
                Über das Vega Crimelife Projekt
              </h3>
              <p className="text-[12px] text-[#A3A3A3]">
                Konzipiert für anspruchsvolles Roleplay, faire Bedingungen und langfristigen Spielspaß.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-[#111111] p-3 rounded-[6px] border border-[#292929] space-y-1">
                <div className="flex items-center gap-1.5 text-[#8B5CF6] font-semibold text-[13px]">
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>Hardcore RP</span>
                </div>
                <p className="text-[11px] text-[#A3A3A3] leading-relaxed">
                  Realistische Gesetze, durchdachte Fraktionen (Polizei, Rettungsdienst, Justiz, Gangs) und zivile Berufe.
                </p>
              </div>

              <div className="bg-[#111111] p-3 rounded-[6px] border border-[#292929] space-y-1">
                <div className="flex items-center gap-1.5 text-[#8B5CF6] font-semibold text-[13px]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Custom Features</span>
                </div>
                <p className="text-[11px] text-[#A3A3A3] leading-relaxed">
                  Eigene MLOs, optimierte Fahrzeug-Handlings und performante FiveM-Skripte für stabile Bildraten.
                </p>
              </div>

              <div className="bg-[#111111] p-3 rounded-[6px] border border-[#292929] space-y-1">
                <div className="flex items-center gap-1.5 text-[#8B5CF6] font-semibold text-[13px]">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Faire Moderation</span>
                </div>
                <p className="text-[11px] text-[#A3A3A3] leading-relaxed">
                  Kein Pay-to-Win. Transparente Entscheidungen der Teamleitung und ein integriertes Support-Ticketsystem.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RECHTE SIDEBAR (28% -> 3.5 / 12 Spalten) */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-5">
          {/* 1. BENUTZERBEREICH */}
          {currentUser ? (
            <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-4 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={
                    currentUser.avatarUrl ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'
                  }
                  alt={currentUser.username}
                  className="w-10 h-10 rounded-[6px] object-cover border border-[#292929]"
                />
                <div className="min-w-0">
                  <Link
                    href={`/user/${currentUser.username}`}
                    className="font-semibold text-xs text-[#F5F5F5] hover:text-[#8B5CF6] transition block truncate"
                  >
                    {currentUser.username}
                  </Link>
                  <span className="text-[11px] text-[#8B5CF6] font-medium block">
                    {currentUser.role.displayName}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#292929] text-[11px] text-[#A3A3A3]">
                <div>
                  <span className="block text-[#737373] text-[10px]">Rolle</span>
                  <span className="text-[#F5F5F5] font-medium">{currentUser.role.displayName}</span>
                </div>
                <div>
                  <span className="block text-[#737373] text-[10px]">Status</span>
                  <span className="text-emerald-400 font-medium">Online</span>
                </div>
              </div>

              <Link
                href={`/user/${currentUser.username}`}
                className="block w-full py-1.5 text-center text-xs text-[#F5F5F5] bg-[#111111] hover:bg-[#1D1D1D] border border-[#292929] rounded-[6px] transition font-medium"
              >
                Mein Profil öffnen
              </Link>
            </div>
          ) : (
            <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-4 space-y-3 text-xs">
              <div>
                <h3 className="font-semibold text-sm text-[#F5F5F5]">Mitglied werden</h3>
                <p className="text-[12px] text-[#A3A3A3] mt-1 leading-relaxed">
                  Registriere dich, um Themen zu verfassen und an Diskussionen teilzunehmen.
                </p>
              </div>

              <div className="flex gap-2 pt-0.5">
                <Link
                  href="/login"
                  className="flex-1 py-1.5 text-center text-xs font-medium text-white bg-[#8B5CF6] hover:bg-[#A78BFA] rounded-[6px] transition"
                >
                  Anmelden
                </Link>
                <Link
                  href="/register"
                  className="flex-1 py-1.5 text-center text-xs font-medium text-[#F5F5F5] bg-[#111111] hover:bg-[#1D1D1D] border border-[#292929] rounded-[6px] transition"
                >
                  Registrieren
                </Link>
              </div>
            </div>
          )}

          {/* 2. COMMUNITY STATISTIKEN */}
          <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-4 space-y-2 text-xs">
            <h3 className="text-[13px] font-semibold text-[#F5F5F5] border-b border-[#292929] pb-2">
              Community Statistiken
            </h3>
            <div className="space-y-1.5 pt-1 text-[12px]">
              <div className="flex justify-between text-[#A3A3A3]">
                <span>Mitglieder</span>
                <span className="font-semibold text-[#F5F5F5]">{totalUsers}</span>
              </div>
              <div className="flex justify-between text-[#A3A3A3]">
                <span>Themen</span>
                <span className="font-semibold text-[#F5F5F5]">{totalThreads}</span>
              </div>
              <div className="flex justify-between text-[#A3A3A3]">
                <span>Beiträge</span>
                <span className="font-semibold text-[#F5F5F5]">{totalPosts}</span>
              </div>
              <div className="flex justify-between text-[#A3A3A3] pt-1 border-t border-[#292929]">
                <span>Neuestes Mitglied</span>
                <span className="font-semibold text-[#8B5CF6] truncate max-w-[120px]">
                  {latestUser?.username || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. MITGLIEDER ONLINE */}
          <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#292929] pb-2">
              <h3 className="text-[13px] font-semibold text-[#F5F5F5]">
                Mitglieder online
              </h3>
              <Link
                href="/members"
                className="text-[11px] text-[#8B5CF6] hover:text-[#A78BFA] transition"
              >
                Alle ({activeMembers.length})
              </Link>
            </div>
            <div className="space-y-2 text-xs">
              {activeMembers.slice(0, 5).map((member) => (
                <div key={member.id} className="flex items-center gap-2.5">
                  <img
                    src={
                      member.avatarUrl ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80'
                    }
                    alt=""
                    className="w-6 h-6 rounded-[4px] object-cover border border-[#292929]"
                  />
                  <Link
                    href={`/user/${member.username}`}
                    className="text-[#A3A3A3] hover:text-[#8B5CF6] transition text-[12px] truncate"
                  >
                    {member.username}
                  </Link>
                  <span className="text-[10px] text-[#737373] ml-auto">
                    {member.role.displayName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
