'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { formatTimeAgo } from '@/lib/utils';
import {
  Search,
  MessageSquare,
  FileText,
  Users,
  Folder,
  Eye,
  Clock,
  SlidersHorizontal,
  X,
  ArrowRight,
  Loader2,
} from 'lucide-react';

type SearchTab = 'all' | 'threads' | 'posts' | 'users' | 'forums';

function stripBBCode(text: string): string {
  return text
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getExcerpt(content: string, query: string, maxLen = 180): string {
  const clean = stripBBCode(content);
  if (!query) return clean.slice(0, maxLen);
  const idx = clean.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return clean.slice(0, maxLen) + (clean.length > maxLen ? '…' : '');
  const start = Math.max(0, idx - 60);
  const end = Math.min(clean.length, idx + query.length + 100);
  return (start > 0 ? '…' : '') + clean.slice(start, end) + (end < clean.length ? '…' : '');
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams?.get('q') || '';

  const [query, setQuery] = useState(initialQ);
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [sort, setSort] = useState<'recent' | 'replies' | 'views'>('recent');
  const [loading, setLoading] = useState(false);

  const [results, setResults] = useState<{
    threads: any[];
    posts: any[];
    users: any[];
    forums: any[];
  }>({
    threads: [],
    posts: [],
    users: [],
    forums: [],
  });

  useEffect(() => {
    setQuery(initialQ);
  }, [initialQ]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults({ threads: [], posts: [], users: [], forums: [] });
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}&sort=${sort}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          setResults({
            threads: data.threads || [],
            posts: data.posts || [],
            users: data.users || [],
            forums: data.forums || [],
          });
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, sort]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.replace(`/search?q=${encodeURIComponent(trimmed)}`, { scroll: false });
    }
  };

  const totalCount =
    results.threads.length +
    results.posts.length +
    results.users.length +
    results.forums.length;

  const tabs: { id: SearchTab; label: string; count: number; icon: any }[] = [
    { id: 'all', label: 'Alle Ergebnisse', count: totalCount, icon: Search },
    { id: 'threads', label: 'Themen', count: results.threads.length, icon: MessageSquare },
    { id: 'posts', label: 'Beiträge', count: results.posts.length, icon: FileText },
    { id: 'users', label: 'Mitglieder', count: results.users.length, icon: Users },
    { id: 'forums', label: 'Kanäle', count: results.forums.length, icon: Folder },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Suchkopf */}
      <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-[#F5F5F5]">Community Suche</h1>
            <p className="text-xs text-[#999999]">
              Durchsuche Themen, Beiträge, Mitglieder und Forenkanäle in Echtzeit.
            </p>
          </div>

          {/* Sortierung */}
          <div className="flex items-center gap-2 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span className="text-[#999999]">Sortierung:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="bg-[#111111] border border-[#292929] rounded-[6px] px-2.5 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="recent">Neueste Aktivität</option>
              <option value="replies">Meiste Antworten</option>
              <option value="views">Meiste Aufrufe</option>
            </select>
          </div>
        </div>

        {/* Suchfeld */}
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8B5CF6] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              placeholder="Suchbegriff, Thema, Spielername oder Stichwort eingeben..."
              className="w-full h-11 bg-[#111111] border border-[#292929] rounded-[6px] pl-10 pr-9 text-sm text-[#F5F5F5] placeholder-[#666666] focus:outline-none focus:border-[#8B5CF6] transition"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  router.replace('/search', { scroll: false });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#F5F5F5]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="h-11 px-5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-semibold rounded-[6px] transition flex items-center gap-2 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Suchen</span>
          </button>
        </form>

        {/* Filter-Tabs */}
        {query.trim() && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-[#292929]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? 'bg-[#8B5CF6] text-white'
                      : 'bg-[#111111] text-[#A3A3A3] hover:text-[#F5F5F5] border border-[#292929]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] ${
                      isActive ? 'bg-black/25 text-white' : 'bg-[#1A1A1A] text-[#8B5CF6]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Ergebnisse */}
      {!query.trim() ? (
        <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-10 text-center space-y-2">
          <Search className="w-8 h-8 text-[#8B5CF6] mx-auto opacity-80" />
          <p className="text-sm font-semibold text-[#F5F5F5]">Wonach suchst du?</p>
          <p className="text-xs text-[#888888] max-w-md mx-auto">
            Gib oben einen Begriff ein – die Ergebnisse werden sofort während des Tippens geladen.
          </p>
        </div>
      ) : totalCount === 0 && !loading ? (
        <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-10 text-center space-y-2">
          <p className="text-sm font-semibold text-[#F5F5F5]">
            Keine Treffer für &bdquo;{query.trim()}&ldquo;
          </p>
          <p className="text-xs text-[#888888]">
            Überprüfe die Schreibweise oder probiere einen allgemeineren Suchbegriff.
          </p>
        </div>
      ) : (
        <div className="space-y-5 text-xs">
          {/* 1. GEFUNDENE MITGLIEDER */}
          {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
            <div className="bg-[#161616] border border-[#292929] rounded-[8px] overflow-hidden">
              <div className="bg-[#111111] px-4 py-2.5 border-b border-[#292929] flex items-center justify-between">
                <span className="font-semibold text-[#F5F5F5] uppercase text-[11px] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#8B5CF6]" />
                  <span>Mitglieder ({results.users.length})</span>
                </span>
              </div>
              <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {results.users.map((u) => (
                  <Link
                    key={u.id}
                    href={`/user/${u.username}`}
                    className="p-2.5 bg-[#111111] hover:bg-[#1D1D1D] border border-[#292929] hover:border-[#8B5CF6]/50 rounded-[6px] flex items-center gap-3 transition group"
                  >
                    <img
                      src={
                        u.avatarUrl ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'
                      }
                      alt={u.username}
                      className="w-9 h-9 rounded-[6px] object-cover border border-[#292929] shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[#F5F5F5] group-hover:text-[#8B5CF6] transition truncate">
                        {u.displayName || u.username}
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-[#8B5CF6] font-medium">{u.role.displayName}</span>
                        <span className="text-[#666666]">• {u._count.posts} Beiträge</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 2. GEFUNDENE FORENKANÄLE */}
          {(activeTab === 'all' || activeTab === 'forums') && results.forums.length > 0 && (
            <div className="bg-[#161616] border border-[#292929] rounded-[8px] overflow-hidden">
              <div className="bg-[#111111] px-4 py-2.5 border-b border-[#292929] flex items-center justify-between">
                <span className="font-semibold text-[#F5F5F5] uppercase text-[11px] flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-[#8B5CF6]" />
                  <span>Forenkanäle ({results.forums.length})</span>
                </span>
              </div>
              <div className="divide-y divide-[#292929]">
                {results.forums.map((f) => (
                  <Link
                    key={f.id}
                    href={`/forum/${f.id}`}
                    className="p-3.5 hover:bg-[#1D1D1D] transition flex items-center justify-between gap-3 group"
                  >
                    <div>
                      <div className="font-semibold text-[#F5F5F5] group-hover:text-[#8B5CF6] transition">
                        {f.name}
                      </div>
                      {f.description && (
                        <div className="text-[11px] text-[#888888]">{f.description}</div>
                      )}
                    </div>
                    <div className="text-[11px] text-[#999999] flex items-center gap-1.5 shrink-0">
                      <span>{f._count.threads} Themen</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 3. GEFUNDENE THEMEN */}
          {(activeTab === 'all' || activeTab === 'threads') && results.threads.length > 0 && (
            <div className="bg-[#161616] border border-[#292929] rounded-[8px] overflow-hidden">
              <div className="bg-[#111111] px-4 py-2.5 border-b border-[#292929] flex items-center justify-between">
                <span className="font-semibold text-[#F5F5F5] uppercase text-[11px] flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#8B5CF6]" />
                  <span>Themen ({results.threads.length})</span>
                </span>
              </div>

              <div className="divide-y divide-[#292929]">
                {results.threads.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 hover:bg-[#1D1D1D] transition flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={
                          t.author.avatarUrl ||
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'
                        }
                        alt={t.author.username}
                        className="w-8 h-8 rounded-[5px] object-cover border border-[#292929] shrink-0 hidden sm:block"
                      />
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {t.prefix && (
                            <span className="px-1.5 py-0.2 rounded-[4px] text-[10px] font-semibold bg-[#111111] text-[#8B5CF6] border border-[#292929]">
                              {t.prefix.name}
                            </span>
                          )}
                          <Link
                            href={`/forum/thread/${t.id}`}
                            className="font-semibold text-[13px] text-[#F5F5F5] hover:text-[#8B5CF6] transition truncate"
                          >
                            {t.title}
                          </Link>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#737373] flex-wrap">
                          <Link
                            href={`/forum/${t.forum.id}`}
                            className="text-[#A3A3A3] hover:text-[#8B5CF6] transition"
                          >
                            {t.forum.name}
                          </Link>
                          <span>•</span>
                          <span>von {t.author.username}</span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(t.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right text-[11px] text-[#999999] shrink-0">
                      <div className="hidden sm:block">
                        <span className="text-[#F5F5F5] font-semibold">{t.viewsCount || 0}</span>
                        <span className="text-[10px] text-[#737373] ml-1">Aufrufe</span>
                      </div>
                      <div>
                        <span className="text-[#8B5CF6] font-semibold">{t._count.posts}</span>
                        <span className="text-[10px] text-[#737373] ml-1">Antworten</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. GEFUNDENE BEITRÄGE (MIT TEXTAUSSCHNITT) */}
          {(activeTab === 'all' || activeTab === 'posts') && results.posts.length > 0 && (
            <div className="bg-[#161616] border border-[#292929] rounded-[8px] overflow-hidden">
              <div className="bg-[#111111] px-4 py-2.5 border-b border-[#292929] flex items-center justify-between">
                <span className="font-semibold text-[#F5F5F5] uppercase text-[11px] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#8B5CF6]" />
                  <span>Beiträge ({results.posts.length})</span>
                </span>
              </div>

              <div className="divide-y divide-[#292929]">
                {results.posts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/forum/thread/${p.thread.id}`}
                    className="p-3.5 hover:bg-[#1D1D1D] transition block space-y-1.5 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-[#F5F5F5] group-hover:text-[#8B5CF6] transition truncate">
                          {p.thread.title}
                        </span>
                        <span className="text-[10px] text-[#737373] shrink-0">
                          in {p.thread.forum.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#737373] shrink-0">
                        {formatTimeAgo(p.createdAt)}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#A3A3A3] line-clamp-2 leading-relaxed">
                      {getExcerpt(p.content, query.trim())}
                    </p>
                    <div className="text-[11px] text-[#737373]">
                      Geschrieben von <span className="text-[#8B5CF6]">{p.author.username}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-4xl mx-auto p-8 text-center text-xs text-[#999999]">Suche wird geladen...</div>}>
      <SearchContent />
    </Suspense>
  );
}
