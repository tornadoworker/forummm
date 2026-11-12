import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatTimeAgo } from '@/lib/utils';
import { SUBFORUMS_MAP } from '@/components/ForumChannelRow';
import {
  MessageSquare,
  Plus,
  Pin,
  Lock,
  ChevronRight,
  Folder,
  Shield,
  Layers,
  ArrowRight,
  Archive,
  Tag,
  Crosshair,
  Swords
} from 'lucide-react';

export const revalidate = 0;

export default async function ForumViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ forumId: string }>;
  searchParams: Promise<{ sub?: string; prefix?: string }>;
}) {
  const { forumId } = await params;
  const { prefix: selectedPrefixName } = await searchParams;

  const [currentUser, forum, allPrefixes] = await Promise.all([
    getCurrentUser(),
    prisma.forum.findUnique({
      where: { id: forumId },
      include: {
        category: true,
        parent: true,
        subforums: {
          orderBy: { order: 'asc' },
          include: {
            _count: { select: { threads: true } },
            threads: {
              where: { isDeleted: false },
              orderBy: { lastActivityAt: 'desc' },
              take: 1,
              include: {
                author: { include: { role: true } },
                prefix: true,
                posts: {
                  where: { isDeleted: false },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                  include: { author: true },
                },
              },
            },
          },
        },
        threads: {
          where: { isDeleted: false },
          orderBy: [{ isPinned: 'desc' }, { lastActivityAt: 'desc' }],
          include: {
            author: { include: { role: true } },
            prefix: true,
            posts: {
              where: { isDeleted: false },
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { author: true },
            },
            _count: { select: { posts: true } },
          },
        },
        _count: { select: { threads: true } },
      },
    }),
    prisma.threadPrefix.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    }),
  ]);

  if (!forum) {
    notFound();
  }

  const displayedThreads =
    selectedPrefixName && selectedPrefixName !== 'all'
      ? forum.threads.filter((t) => t.prefix?.name === selectedPrefixName)
      : forum.threads;

  // Falls es sich um ein Hauptforum handelt, reale Subforen verwenden
  const hasSubforums = forum.subforums && forum.subforums.length > 0;
  const isSubforum = Boolean(forum.parent);
  const isArchivedForum = Boolean(forum.isArchived || forum.name.toLowerCase() === 'archiv');

  return (
    <div className="space-y-4">
      {/* Breadcrumb mit echter Parent-Hierarchie */}
      <div className="flex items-center gap-1.5 text-xs text-[#A3A3A3] flex-wrap">
        <Link href="/" className="hover:text-[#F5F5F5] transition">
          Startseite
        </Link>
        <ChevronRight className="w-3 h-3 text-[#525252]" />
        <Link href="/forum" className="hover:text-[#F5F5F5] transition">
          Forenkanäle
        </Link>
        {forum.parent && (
          <>
            <ChevronRight className="w-3 h-3 text-[#525252]" />
            <Link
              href={`/forum/${forum.parent.id}`}
              className="hover:text-[#F5F5F5] transition"
            >
              {forum.parent.name}
            </Link>
          </>
        )}
        <ChevronRight className="w-3 h-3 text-[#525252]" />
        <span className="text-[#F5F5F5] font-medium">{forum.name}</span>
      </div>

      {/* Forum Header Leiste */}
      <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-[#F5F5F5] flex items-center gap-2">
              {isArchivedForum ? (
                <Archive className="w-5 h-5 text-[#EF4444]" />
              ) : (
                <MessageSquare className="w-5 h-5 text-[#8B5CF6]" />
              )}
              <span>{forum.name}</span>
            </h1>
            {isSubforum && (
              <span className="px-2 py-0.5 bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#8B5CF6] text-[10px] font-semibold rounded-[4px]">
                Unterforum von {forum.parent?.name}
              </span>
            )}
            {isArchivedForum ? (
              <span className="px-2 py-0.5 bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#EF4444] text-[10px] font-bold rounded-[3px] uppercase flex items-center gap-1">
                <Lock className="w-3 h-3" />
                ARCHIV
              </span>
            ) : (
              <span className="px-1.5 py-0.5 bg-[#E11D48] text-white text-[9px] font-bold rounded-[3px] uppercase">
                NEW
              </span>
            )}
          </div>
          {forum.description && (
            <p className="text-xs text-[#A3A3A3] max-w-2xl">{forum.description}</p>
          )}

          {/* Sub-forums Schnell-Navigation falls Hauptforum */}
          {hasSubforums && (
            <div className="pt-2 flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-[11px] text-[#737373] mr-1">Unterforen:</span>
              <span className="px-2 py-0.5 rounded-[4px] text-[11px] bg-[#8B5CF6] text-white font-medium">
                Hauptübersicht
              </span>
              {forum.subforums.map((sf) => (
                <Link
                  key={sf.id}
                  href={`/forum/${sf.id}`}
                  className="px-2 py-0.5 rounded-[4px] text-[11px] bg-[#111111] hover:bg-[#1D1D1D] hover:text-[#8B5CF6] text-[#A3A3A3] border border-[#292929] transition flex items-center gap-1"
                >
                  {(sf.isArchived || sf.name.toLowerCase() === 'archiv') && (
                    <Archive className="w-3 h-3 text-[#EF4444]" />
                  )}
                  <span>{sf.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Neues Thema Button - Nur wenn nicht archiviert! */}
        {isArchivedForum ? (
          <div className="self-start sm:self-auto h-9 px-3.5 bg-[#111111] border border-[#EF4444]/30 text-[#A3A3A3] text-xs font-medium rounded-[6px] inline-flex items-center gap-1.5 shrink-0">
            <Lock className="w-3.5 h-3.5 text-[#EF4444]" />
            <span>Archiv (Schreibgeschützt)</span>
          </div>
        ) : (
          currentUser?.role.canCreateThreads && (
            <Link
              href={`/forum/new?forumId=${forum.id}`}
              className="self-start sm:self-auto h-9 px-3.5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-[13px] font-medium rounded-[6px] transition inline-flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Neues Thema</span>
            </Link>
          )
        )}
      </div>

      {/* Live Statistik Feature Card */}
      {(forum.name === 'Live Statistik' || forum.parent?.name === 'Live Statistik') && (
        <div className="bg-[#161616] border border-[#8B5CF6]/40 rounded-[8px] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[6px] bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6] shrink-0">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F5F5F5]">Offizielle Live-Statistiken & Ranglisten</h3>
              <p className="text-xs text-[#A3A3A3] mt-0.5">
                Einsicht in verifizierte Kills, K/D-Werte, Headshots und Fraktionserfolge auf Vega Crimelife.
              </p>
            </div>
          </div>
          <Link
            href="/stats"
            className="h-8 px-4 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-medium rounded-[5px] transition flex items-center gap-1.5 shrink-0"
          >
            <span>Live-Statistik aufrufen</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Wettbewerbe Feature Card */}
      {(forum.name === 'Wettbewerbe' || forum.parent?.name === 'Wettbewerbe') && (
        <div className="bg-[#161616] border border-amber-500/40 rounded-[8px] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[6px] bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F5F5F5]">Wettbewerbe, 1v1 Duelle & Turniere</h3>
              <p className="text-xs text-[#A3A3A3] mt-0.5">
                Tritt Turnieren bei, fordere Spieler zu 1v1 Shootouts heraus oder sieh dir Spielpläne an.
              </p>
            </div>
          </div>
          <Link
            href="/competitions"
            className="h-8 px-4 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-medium rounded-[5px] transition flex items-center gap-1.5 shrink-0"
          >
            <span>Wettbewerbe öffnen</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Schreibschutz-Hinweis für Archive */}
      {isArchivedForum && (
        <div className="bg-[#111111] border border-[#EF4444]/30 rounded-[8px] p-4 text-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-[6px] bg-[#EF4444]/15 border border-[#EF4444]/30 flex items-center justify-center shrink-0 mt-0.5">
            <Archive className="w-4 h-4 text-[#EF4444]" />
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-[#F5F5F5] flex items-center gap-2">
              <span>Schreibgeschütztes Archiv</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-[#EF4444]/20 text-[#EF4444] rounded">Vollständiger Schreibschutz</span>
            </div>
            <p className="text-[#A3A3A3] text-[11px] leading-relaxed">
              In diesem Archiv werden alle abgelehnten und archivierten Themen dauerhaft und geschlossen aufbewahrt. Das Erstellen neuer Themen oder Antworten ist in diesem Archiv für alle Benutzer strikt deaktiviert.
            </p>
          </div>
        </div>
      )}

      {/* Kanalregeln falls gepflegt */}
      {forum.rules && (
        <div className="bg-[#111111] border border-[#8B5CF6]/30 rounded-[8px] p-4 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-[#8B5CF6]">
            <Shield className="w-4 h-4" />
            <span>Kanalregeln & Richtlinien für {forum.name}</span>
          </div>
          <p className="whitespace-pre-line text-[#A3A3A3] text-[12px] leading-relaxed">
            {forum.rules}
          </p>
        </div>
      )}

      {/* Falls Hauptforum mit Subforen: Subforen-Kanalliste anzeigen */}
      {hasSubforums && (
        <div className="bg-[#161616] border border-[#292929] rounded-[8px] overflow-hidden shadow-sm space-y-0">
          <div className="bg-[#111111] px-4 py-2.5 border-b border-[#292929] flex items-center justify-between text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider">
            <span>Unterforen ({forum.subforums.length})</span>
            <span className="hidden sm:inline">Themen</span>
          </div>
          <div className="divide-y divide-[#292929]">
            {forum.subforums.map((subforum) => {
              const latestSubThread = subforum.threads?.[0];
              return (
                <div
                  key={subforum.id}
                  className="p-3.5 hover:bg-[#1D1D1D] transition flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`w-7 h-7 rounded-[4px] bg-[#111111] border border-[#292929] flex items-center justify-center shrink-0 mt-0.5 ${
                      subforum.isArchived || subforum.name.toLowerCase() === 'archiv'
                        ? 'text-[#EF4444]'
                        : 'text-[#8B5CF6]'
                    }`}>
                      {subforum.isArchived || subforum.name.toLowerCase() === 'archiv' ? (
                        <Archive className="w-3.5 h-3.5" />
                      ) : (
                        <Folder className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <Link
                        href={`/forum/${subforum.id}`}
                        className="font-bold text-[13px] text-[#F5F5F5] hover:text-[#8B5CF6] transition flex items-center gap-1.5"
                      >
                        <span>{subforum.name}</span>
                        {(subforum.isArchived || subforum.name.toLowerCase() === 'archiv') && (
                          <span className="px-1.5 py-0.2 bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-[9px] font-semibold rounded-[3px]">
                            Schreibgeschützt
                          </span>
                        )}
                        <ArrowRight className="w-3 h-3 text-[#737373]" />
                      </Link>
                      {subforum.description && (
                        <p className="text-[11px] text-[#737373] truncate">
                          {subforum.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0 text-xs text-[#A3A3A3]">
                    <div className="text-center min-w-[45px]">
                      <span className="font-bold text-[#F5F5F5] block">
                        {subforum._count?.threads ?? 0}
                      </span>
                      <span className="text-[10px] text-[#737373]">Themen</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Themenliste */}
      <div className="bg-[#161616] border border-[#292929] rounded-[8px] overflow-hidden shadow-sm">
        {/* Präfix Filterleiste */}
        {forum.threads.length > 0 && (
          <div className="bg-[#111111] px-4 py-2 border-b border-[#292929] flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-[11px] text-[#737373] font-medium mr-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-[#8B5CF6]" />
              <span>Filter:</span>
            </span>
            <Link
              href={`/forum/${forum.id}`}
              className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium transition ${
                !selectedPrefixName || selectedPrefixName === 'all'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'bg-[#161616] text-[#A3A3A3] hover:text-[#F5F5F5] border border-[#292929]'
              }`}
            >
              Alle ({forum.threads.length})
            </Link>
            {allPrefixes.map((pfx) => {
              const count = forum.threads.filter((t) => t.prefixId === pfx.id).length;
              if (count === 0) return null;
              const isSelected = selectedPrefixName === pfx.name;
              return (
                <Link
                  key={pfx.id}
                  href={`/forum/${forum.id}?prefix=${encodeURIComponent(pfx.name)}`}
                  className={`px-2 py-0.5 rounded-[4px] text-[11px] font-semibold transition border flex items-center gap-1 ${
                    isSelected ? 'ring-1 ring-[#8B5CF6]' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    color: pfx.color,
                    backgroundColor: pfx.bgColor || '#161616',
                    borderColor: isSelected ? pfx.color : '#292929',
                  }}
                >
                  <span>{pfx.name}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Kopfzeile der Tabelle */}
        <div className="bg-[#111111] px-4 py-2.5 border-b border-[#292929] flex items-center justify-between text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider">
          <span>Thema</span>
          <div className="hidden sm:flex items-center gap-12 pr-4">
            <span className="w-16 text-center">Antworten</span>
            <span className="w-36 text-right">Letzter Beitrag</span>
          </div>
        </div>

        {displayedThreads.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#737373]">
            {selectedPrefixName
              ? `Keine Themen mit dem Präfix "${selectedPrefixName}" gefunden.`
              : 'In diesem Forenkanal gibt es noch keine Themen.'}
          </div>
        ) : (
          <div className="divide-y divide-[#292929]">
            {displayedThreads.map((thread) => {
              const latestPost = thread.posts[0];
              return (
                <div
                  key={thread.id}
                  className={`p-3.5 hover:bg-[#1D1D1D] transition flex items-center justify-between gap-3 text-xs ${
                    thread.isPinned ? 'bg-[#1D1D1D]/40' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <img
                      src={
                        thread.author.avatarUrl ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80'
                      }
                      alt=""
                      className="w-7 h-7 rounded-full object-cover border border-[#292929] shrink-0 mt-0.5"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {thread.prefix && (
                          <span
                            className="px-1.5 py-0.2 rounded-[3px] text-[10px] font-bold"
                            style={{
                              color: thread.prefix.color,
                              backgroundColor: thread.prefix.bgColor,
                            }}
                          >
                            {thread.prefix.name}
                          </span>
                        )}
                        <Link
                          href={`/forum/thread/${thread.id}`}
                          className="font-medium text-[13px] text-[#F5F5F5] hover:text-[#8B5CF6] transition truncate"
                        >
                          {thread.title}
                        </Link>
                        {thread.isPinned && (
                          <Pin className="w-3 h-3 text-[#8B5CF6] shrink-0" />
                        )}
                        {thread.isLocked && (
                          <Lock className="w-3 h-3 text-[#737373] shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-[#737373]">
                        <span style={{ color: thread.author.role?.color || '#A3A3A3' }}>
                          {thread.author.username}
                        </span>
                        <span>•</span>
                        <span>{formatTimeAgo(thread.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Zähler & letzter Post */}
                  <div className="hidden sm:flex items-center gap-12 shrink-0 pr-4 text-[12px] text-[#A3A3A3]">
                    <div className="w-16 text-center font-bold text-[#F5F5F5]">
                      {thread._count.posts}
                    </div>
                    <div className="w-36 text-right">
                      {latestPost ? (
                        <div>
                          <span className="text-[#F5F5F5] block truncate font-medium">
                            {latestPost.author.username}
                          </span>
                          <span className="text-[10px] text-[#737373]">
                            {formatTimeAgo(latestPost.createdAt)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#737373]">-</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
