'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { formatTimeAgo, formatCustomDate } from '@/lib/utils';
import {
  WarnUserModal,
  BanUserModal,
  MoveThreadModal,
  ChangePrefixModal,
} from '@/components/ModerationModals';
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  Ban,
  MicOff,
  MessageSquare,
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Folder,
  Lock,
  Unlock,
  Pin,
  Trash2,
  RotateCcw,
  ExternalLink,
  Plus,
  History,
  Download,
  Clock,
  UserX,
  FileText,
  UserCheck,
  Check,
  Tag
} from 'lucide-react';

/* =========================================================================
 * 1. MODERATIONSÜBERSICHT TAB
 * ========================================================================= */
export function ModOverviewView({
  stats,
  reports,
  warnings,
  auditLogs,
  onSwitchTab,
  onResolveReport,
}: {
  stats: any;
  reports: any[];
  warnings: any[];
  auditLogs: any[];
  onSwitchTab: (tab: any) => void;
  onResolveReport: (reportId: string, status: string, note?: string) => Promise<void>;
}) {
  const openReports = reports.filter((r) => r.status === 'OPEN' || r.status === 'IN_PROGRESS');

  return (
    <div className="space-y-6">
      {/* 6 KPI Karten */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => onSwitchTab('mod-reports')}
          className="bg-[#161616] border border-[#292929] hover:border-[#8B5CF6]/50 rounded-[6px] p-3.5 space-y-2 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-[#A3A3A3]">
            <span className="text-[11px] font-medium uppercase tracking-wider">Offene Meldungen</span>
            <AlertTriangle className={`w-4 h-4 ${stats.openReportsCount > 0 ? 'text-amber-500 animate-pulse' : 'text-[#737373]'}`} />
          </div>
          <div className="text-xl font-bold text-[#F5F5F5]">{stats.openReportsCount}</div>
        </div>

        <div
          onClick={() => onSwitchTab('mod-posts')}
          className="bg-[#161616] border border-[#292929] hover:border-[#8B5CF6]/50 rounded-[6px] p-3.5 space-y-2 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-[#A3A3A3]">
            <span className="text-[11px] font-medium uppercase tracking-wider">Gemeldete Beiträge</span>
            <MessageSquare className="w-4 h-4 text-[#8B5CF6]" />
          </div>
          <div className="text-xl font-bold text-[#F5F5F5]">{stats.flaggedPostsCount}</div>
        </div>

        <div
          onClick={() => onSwitchTab('mod-users')}
          className="bg-[#161616] border border-[#292929] hover:border-[#8B5CF6]/50 rounded-[6px] p-3.5 space-y-2 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-[#A3A3A3]">
            <span className="text-[11px] font-medium uppercase tracking-wider">Gemeldete Benutzer</span>
            <Users className="w-4 h-4 text-[#8B5CF6]" />
          </div>
          <div className="text-xl font-bold text-[#F5F5F5]">{stats.flaggedUsersCount}</div>
        </div>

        <div
          onClick={() => onSwitchTab('mod-bans')}
          className="bg-[#161616] border border-[#292929] hover:border-[#8B5CF6]/50 rounded-[6px] p-3.5 space-y-2 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-[#A3A3A3]">
            <span className="text-[11px] font-medium uppercase tracking-wider">Aktive Sperren</span>
            <Ban className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-xl font-bold text-[#F5F5F5]">{stats.activeBansCount}</div>
        </div>

        <div
          onClick={() => onSwitchTab('mod-warnings')}
          className="bg-[#161616] border border-[#292929] hover:border-[#8B5CF6]/50 rounded-[6px] p-3.5 space-y-2 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-[#A3A3A3]">
            <span className="text-[11px] font-medium uppercase tracking-wider">Verwarnungen</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-[#F5F5F5]">{stats.activeWarningsCount}</div>
        </div>

        <div
          onClick={() => onSwitchTab('mod-bans')}
          className="bg-[#161616] border border-[#292929] hover:border-[#8B5CF6]/50 rounded-[6px] p-3.5 space-y-2 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-[#A3A3A3]">
            <span className="text-[11px] font-medium uppercase tracking-wider">Schreibsperren</span>
            <MicOff className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-[#F5F5F5]">{stats.activeMutesCount}</div>
        </div>
      </div>

      {/* Offene Fälle (Warteschlange) */}
      <div className="bg-[#161616] border border-[#292929] rounded-[6px] overflow-hidden">
        <div className="bg-[#111111] px-4 py-3 border-b border-[#292929] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider">
              Dringende Meldungen ({openReports.length})
            </h3>
          </div>
          <button
            onClick={() => onSwitchTab('mod-reports')}
            className="text-xs text-[#8B5CF6] hover:underline"
          >
            Alle Meldungen öffnen ›
          </button>
        </div>

        {openReports.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#737373]">
            Aktuell liegen keine offenen Meldungen vor. Die Warteschlange ist leer.
          </div>
        ) : (
          <div className="divide-y divide-[#292929]">
            {openReports.slice(0, 5).map((rep) => (
              <div key={rep.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-1.5 py-0.2 bg-[#111111] border border-[#292929] text-[10px] font-semibold text-[#8B5CF6] rounded uppercase">
                      {rep.type}
                    </span>
                    <span className="font-semibold text-[#F5F5F5]">Grund: {rep.reason}</span>
                    <span className="text-[11px] text-[#737373]">• gemeldet von {rep.reporter.username}</span>
                  </div>
                  {rep.description && (
                    <p className="text-[#A3A3A3] text-[11px] italic line-clamp-1">
                      &quot;{rep.description}&quot;
                    </p>
                  )}
                  {rep.thread && (
                    <span className="text-[11px] text-[#737373] block">
                      Thema: <strong className="text-[#F5F5F5]">{rep.thread.title}</strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onResolveReport(rep.id, 'RESOLVED', 'Durch Moderation geprüft und gelöst')}
                    className="px-2.5 py-1 bg-green-950/60 hover:bg-green-900 border border-green-500/50 text-green-400 font-medium rounded text-xs transition"
                  >
                    Lösen
                  </button>
                  <button
                    onClick={() => onResolveReport(rep.id, 'REJECTED', 'Kein Regelverstoß feststellbar')}
                    className="px-2.5 py-1 bg-[#111111] hover:bg-[#202020] border border-[#292929] text-[#A3A3A3] hover:text-[#F5F5F5] rounded text-xs transition"
                  >
                    Abweisen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Letzte Moderationsprotokolle */}
      <div className="bg-[#161616] border border-[#292929] rounded-[6px] overflow-hidden">
        <div className="bg-[#111111] px-4 py-3 border-b border-[#292929] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#8B5CF6]" />
            <h3 className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider">
              Kürzliche Moderationsaktionen
            </h3>
          </div>
          <button
            onClick={() => onSwitchTab('mod-logs')}
            className="text-xs text-[#8B5CF6] hover:underline"
          >
            Vollständiges Protokoll einsehen ›
          </button>
        </div>

        <div className="divide-y divide-[#292929]">
          {auditLogs
            .filter((l) =>
              [
                'USER_WARN',
                'USER_BAN',
                'USER_MUTE',
                'USER_UNBAN',
                'THREAD_LOCK',
                'THREAD_PIN',
                'THREAD_SOFT_DELETE',
                'POST_SOFT_DELETE',
                'REPORT_UPDATE',
              ].includes(l.action)
            )
            .slice(0, 6)
            .map((log) => (
              <div key={log.id} className="p-3 flex items-center justify-between text-xs gap-3">
                <div className="space-y-0.5 truncate">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-semibold text-[#8B5CF6]">{log.action}</span>
                    <span className="text-[#737373] text-[11px] truncate">
                      {log.details || 'Aktion durchgeführt'}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#666666] block">
                    Ausgeführt von: {log.user?.username || 'System'}
                  </span>
                </div>
                <span className="text-[11px] text-[#737373] shrink-0 font-mono">
                  {formatTimeAgo(log.createdAt)}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
 * 2. BEITRÄGE & THEMEN TAB
 * ========================================================================= */
export function ModPostsView({
  threads,
  posts,
  categories,
  onThreadAction,
  onPostAction,
}: {
  threads: any[];
  posts: any[];
  categories: any[];
  onThreadAction: (threadId: string, action: string, data?: any) => Promise<void>;
  onPostAction: (postId: string, action: string, data?: any) => Promise<void>;
}) {
  const [subTab, setSubTab] = useState<'threads' | 'posts'>('threads');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [moveModalThread, setMoveModalThread] = useState<any | null>(null);
  const [prefixModalThread, setPrefixModalThread] = useState<any | null>(null);

  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.author.username.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === 'DELETED'
          ? t.isDeleted
          : statusFilter === 'LOCKED'
          ? t.isLocked
          : statusFilter === 'PINNED'
          ? t.isPinned
          : statusFilter === 'ACTIVE'
          ? !t.isDeleted
          : true;
      return matchSearch && matchStatus;
    });
  }, [threads, search, statusFilter]);

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const matchSearch =
        p.content.toLowerCase().includes(search.toLowerCase()) ||
        p.author.username.toLowerCase().includes(search.toLowerCase()) ||
        (p.thread?.title || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === 'DELETED'
          ? p.isDeleted
          : statusFilter === 'ACTIVE'
          ? !p.isDeleted
          : true;
      return matchSearch && matchStatus;
    });
  }, [posts, search, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Sub-Navigation & Filter */}
      <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 bg-[#111111] p-0.5 rounded-[4px] border border-[#292929]">
          <button
            onClick={() => setSubTab('threads')}
            className={`px-3 py-1.5 rounded-[3px] font-medium transition ${
              subTab === 'threads' ? 'bg-[#8B5CF6] text-white' : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
            }`}
          >
            Themen ({threads.length})
          </button>
          <button
            onClick={() => setSubTab('posts')}
            className={`px-3 py-1.5 rounded-[3px] font-medium transition ${
              subTab === 'posts' ? 'bg-[#8B5CF6] text-white' : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
            }`}
          >
            Beiträge ({posts.length})
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#666666]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen nach Titel / Autor..."
              className="bg-[#101010] border border-[#292929] rounded-[4px] pl-8 pr-3 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6] w-56"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#101010] border border-[#292929] rounded-[4px] px-2.5 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
          >
            <option value="ALL">Status: Alle</option>
            <option value="ACTIVE">Nur Aktive</option>
            <option value="DELETED">Gelöscht / Archiviert</option>
            {subTab === 'threads' && (
              <>
                <option value="LOCKED">Geschlossen</option>
                <option value="PINNED">Angepinnt</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Themen Tabelle */}
      {subTab === 'threads' ? (
        <div className="bg-[#161616] border border-[#292929] rounded-[6px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111111] text-[#A3A3A3] border-b border-[#292929] uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Thema</th>
                  <th className="px-4 py-3">Forum</th>
                  <th className="px-4 py-3">Autor</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Moderationsaktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#292929]">
                {filteredThreads.map((t) => (
                  <tr key={t.id} className="hover:bg-[#1A1A1A] transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#F5F5F5] flex items-center gap-1.5 flex-wrap">
                        {t.prefix && (
                          <span
                            className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase"
                            style={{ color: t.prefix.color, backgroundColor: t.prefix.bgColor }}
                          >
                            {t.prefix.name}
                          </span>
                        )}
                        <span>{t.title}</span>
                      </div>
                      <span className="text-[10px] text-[#737373]">
                        Erstellt vor {formatTimeAgo(t.createdAt)} • {t._count?.posts || 0} Antworten
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#A3A3A3]">{t.forum?.name}</td>
                    <td className="px-4 py-3 text-[#F5F5F5]">{t.author?.username}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {t.isDeleted && (
                          <span className="px-1.5 py-0.5 bg-red-950/60 border border-red-500/50 text-red-400 rounded text-[10px] font-semibold">
                            Gelöscht
                          </span>
                        )}
                        {t.isLocked && (
                          <span className="px-1.5 py-0.5 bg-[#111111] border border-[#292929] text-[#737373] rounded text-[10px]">
                            Geschlossen
                          </span>
                        )}
                        {t.isPinned && (
                          <span className="px-1.5 py-0.5 bg-[#8B5CF6]/20 border border-[#8B5CF6]/50 text-[#8B5CF6] rounded text-[10px] font-semibold">
                            Angepinnt
                          </span>
                        )}
                        {!t.isDeleted && !t.isLocked && !t.isPinned && (
                          <span className="text-[#666666] text-[11px]">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/forum/thread/${t.id}`}
                          target="_blank"
                          className="p-1 text-[#A3A3A3] hover:text-[#F5F5F5] transition"
                          title="Im Forum öffnen"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          onClick={() => onThreadAction(t.id, t.isPinned ? 'UNPIN' : 'PIN')}
                          className={`p-1 rounded transition ${
                            t.isPinned ? 'text-[#8B5CF6]' : 'text-[#737373] hover:text-[#F5F5F5]'
                          }`}
                          title={t.isPinned ? 'Entpinnen' : 'Anpinnen'}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onThreadAction(t.id, t.isLocked ? 'UNLOCK' : 'LOCK')}
                          className={`p-1 rounded transition ${
                            t.isLocked ? 'text-[#8B5CF6]' : 'text-[#737373] hover:text-[#F5F5F5]'
                          }`}
                          title={t.isLocked ? 'Öffnen' : 'Schließen'}
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setMoveModalThread(t)}
                          className="p-1 text-[#737373] hover:text-[#8B5CF6] rounded transition"
                          title="In anderes Forum verschieben"
                        >
                          <Folder className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setPrefixModalThread(t)}
                          className="p-1 text-[#737373] hover:text-[#8B5CF6] rounded transition"
                          title="Präfix ändern"
                        >
                          <Tag className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onThreadAction(t.id, t.isDeleted ? 'RESTORE' : 'DELETE')}
                          className={`p-1 rounded transition ${
                            t.isDeleted ? 'text-green-400 hover:text-green-300' : 'text-[#737373] hover:text-red-400'
                          }`}
                          title={t.isDeleted ? 'Wiederherstellen' : 'Löschen'}
                        >
                          {t.isDeleted ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Beiträge Tabelle */
        <div className="bg-[#161616] border border-[#292929] rounded-[6px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111111] text-[#A3A3A3] border-b border-[#292929] uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Inhalt</th>
                  <th className="px-4 py-3">Thema</th>
                  <th className="px-4 py-3">Autor</th>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#292929]">
                {filteredPosts.map((p) => (
                  <tr key={p.id} className="hover:bg-[#1A1A1A] transition">
                    <td className="px-4 py-3 max-w-md truncate">
                      <div className="text-[#F5F5F5] truncate font-medium">
                        {p.content}
                      </div>
                      {p.isDeleted && (
                        <span className="text-[10px] text-red-400 font-semibold">
                          [Gelöscht / Ausgeblendet]
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#A3A3A3] truncate max-w-xs">
                      {p.thread?.title}
                    </td>
                    <td className="px-4 py-3 text-[#F5F5F5]">{p.author?.username}</td>
                    <td className="px-4 py-3 text-[#737373] whitespace-nowrap">
                      {formatTimeAgo(p.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/forum/thread/${p.threadId}`}
                          target="_blank"
                          className="p-1 text-[#A3A3A3] hover:text-[#F5F5F5]"
                          title="Im Thema ansehen"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          onClick={() => onPostAction(p.id, p.isDeleted ? 'RESTORE' : 'DELETE')}
                          className={`p-1 rounded transition ${
                            p.isDeleted ? 'text-green-400' : 'text-[#737373] hover:text-red-400'
                          }`}
                          title={p.isDeleted ? 'Wiederherstellen' : 'Ausblenden'}
                        >
                          {p.isDeleted ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Move Thread Modal */}
      {moveModalThread && (
        <MoveThreadModal
          isOpen={true}
          onClose={() => setMoveModalThread(null)}
          threadId={moveModalThread.id}
          threadTitle={moveModalThread.title}
          currentForumId={moveModalThread.forumId}
          categories={categories}
          onSuccess={() => {
            setMoveModalThread(null);
            window.location.reload();
          }}
        />
      )}

      {/* Change Prefix Modal */}
      {prefixModalThread && (
        <ChangePrefixModal
          isOpen={true}
          onClose={() => setPrefixModalThread(null)}
          threadId={prefixModalThread.id}
          threadTitle={prefixModalThread.title}
          currentPrefixId={prefixModalThread.prefix?.id || null}
          onSuccess={async () => {
            setPrefixModalThread(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

/* =========================================================================
 * 3. BENUTZER MODERIEREN TAB
 * ========================================================================= */
export function ModUsersView({
  users,
  onWarnUser,
  onBanUser,
  onUnbanUser,
}: {
  users: any[];
  onWarnUser: (user: any) => void;
  onBanUser: (user: any, type: 'BAN' | 'MUTE') => void;
  onUnbanUser: (userId: string, type: 'BAN' | 'MUTE') => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === 'BANNED'
          ? u.isBanned
          : statusFilter === 'MUTED'
          ? u.isMuted
          : statusFilter === 'WARNED'
          ? u.warningPoints > 0
          : statusFilter === 'ACTIVE'
          ? !u.isBanned && !u.isMuted
          : true;
      return matchSearch && matchStatus;
    });
  }, [users, search, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Suchleiste */}
      <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#666666]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Benutzer suchen nach Name oder E-Mail..."
            className="w-full bg-[#101010] border border-[#292929] rounded-[4px] pl-9 pr-3 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#101010] border border-[#292929] rounded-[4px] px-3 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
        >
          <option value="ALL">Status: Alle Benutzer</option>
          <option value="ACTIVE">Nur Aktive</option>
          <option value="WARNED">Nur mit Verwarnungen</option>
          <option value="MUTED">Mit Schreibsperre (Muted)</option>
          <option value="BANNED">Gesperrte Benutzer</option>
        </select>
      </div>

      {/* Tabelle */}
      <div className="bg-[#161616] border border-[#292929] rounded-[6px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] text-[#A3A3A3] border-b border-[#292929] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Benutzer</th>
                <th className="px-4 py-3">Rolle</th>
                <th className="px-4 py-3 text-center">Verwarnungspunkte</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Moderationsaktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#292929]">
              {filtered.map((u) => {
                const points = u.warningPoints || 0;
                return (
                  <tr key={u.id} className="hover:bg-[#1A1A1A] transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={
                            u.avatarUrl ||
                            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80'
                          }
                          alt=""
                          className="w-7 h-7 rounded-[4px] object-cover border border-[#292929]"
                        />
                        <div>
                          <Link
                            href={`/user/${u.username}`}
                            target="_blank"
                            className="font-semibold text-[#F5F5F5] hover:text-[#8B5CF6] transition flex items-center gap-1"
                          >
                            <span>{u.username}</span>
                          </Link>
                          <span className="text-[10px] text-[#737373]">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase"
                        style={{
                          color: u.role?.color || '#A3A3A3',
                          backgroundColor: u.role?.badgeBg || '#111111',
                        }}
                      >
                        {u.role?.displayName || 'Mitglied'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-[4px] text-[11px] font-bold ${
                          points >= 5
                            ? 'bg-red-950/60 border border-red-500/50 text-red-400'
                            : points >= 3
                            ? 'bg-amber-950/60 border border-amber-500/50 text-amber-400'
                            : points > 0
                            ? 'bg-[#111111] border border-[#292929] text-[#E5E5E5]'
                            : 'text-[#666666]'
                        }`}
                      >
                        {points} VP
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.isBanned ? (
                        <span className="px-2 py-0.5 bg-red-950/60 border border-red-500/50 text-red-400 rounded text-[10px] font-bold">
                          Gesperrt
                        </span>
                      ) : u.isMuted ? (
                        <span className="px-2 py-0.5 bg-amber-950/60 border border-amber-500/50 text-amber-400 rounded text-[10px] font-bold">
                          Muted
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-green-950/60 border border-green-500/50 text-green-400 rounded text-[10px] font-semibold">
                          Aktiv
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Verwarnen */}
                        <button
                          onClick={() => onWarnUser(u)}
                          className="px-2 py-1 bg-[#111111] hover:bg-[#202020] border border-[#292929] text-amber-400 rounded text-xs transition flex items-center gap-1"
                          title="Benutzer verwarnen"
                        >
                          <AlertCircle className="w-3 h-3" />
                          <span>Verwarnen</span>
                        </button>

                        {/* Mute */}
                        {u.isMuted ? (
                          <button
                            onClick={() => onUnbanUser(u.id, 'MUTE')}
                            className="px-2 py-1 bg-green-950/50 hover:bg-green-900 border border-green-500/40 text-green-400 rounded text-xs transition"
                          >
                            Unmute
                          </button>
                        ) : (
                          <button
                            onClick={() => onBanUser(u, 'MUTE')}
                            className="px-2 py-1 bg-[#111111] hover:bg-[#202020] border border-[#292929] text-[#A3A3A3] hover:text-[#F5F5F5] rounded text-xs transition"
                            title="Schreibsperre verhängen"
                          >
                            Mute
                          </button>
                        )}

                        {/* Sperre */}
                        {u.isBanned ? (
                          <button
                            onClick={() => onUnbanUser(u.id, 'BAN')}
                            className="px-2 py-1 bg-green-950/50 hover:bg-green-900 border border-green-500/40 text-green-400 rounded text-xs transition"
                          >
                            Entsperren
                          </button>
                        ) : (
                          <button
                            onClick={() => onBanUser(u, 'BAN')}
                            className="px-2 py-1 bg-red-950/50 hover:bg-red-900 border border-red-500/40 text-red-400 rounded text-xs transition"
                            title="Benutzer sperren"
                          >
                            Sperren
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
 * 4. MELDUNGEN (QUEUE) TAB
 * ========================================================================= */
export function ModReportsView({
  reports,
  onResolveReport,
}: {
  reports: any[];
  onResolveReport: (reportId: string, status: string, note?: string) => Promise<void>;
}) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const matchStatus = statusFilter === 'ALL' ? true : r.status === statusFilter;
      const matchType = typeFilter === 'ALL' ? true : r.type === typeFilter;
      return matchStatus && matchType;
    });
  }, [reports, statusFilter, typeFilter]);

  return (
    <div className="space-y-4">
      <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="font-bold text-[#F5F5F5]">Moderations-Queue ({filtered.length})</h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#101010] border border-[#292929] rounded-[4px] px-3 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
          >
            <option value="ALL">Typ: Alle</option>
            <option value="THREAD">Nur Themen</option>
            <option value="POST">Nur Beiträge</option>
            <option value="USER">Nur Profile</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#101010] border border-[#292929] rounded-[4px] px-3 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
          >
            <option value="ALL">Status: Alle</option>
            <option value="OPEN">Offen</option>
            <option value="IN_PROGRESS">In Bearbeitung</option>
            <option value="RESOLVED">Erledigt</option>
            <option value="REJECTED">Abgelehnt</option>
          </select>
        </div>
      </div>

      <div className="bg-[#161616] border border-[#292929] rounded-[6px] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#737373]">
            Keine Meldungen für diesen Filter vorhanden.
          </div>
        ) : (
          <div className="divide-y divide-[#292929]">
            {filtered.map((rep) => (
              <div key={rep.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-1.5 py-0.2 bg-[#111111] border border-[#292929] text-[10px] font-bold text-[#8B5CF6] rounded uppercase">
                      {rep.type}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        rep.status === 'OPEN'
                          ? 'bg-amber-950/60 border border-amber-500/50 text-amber-400'
                          : rep.status === 'RESOLVED'
                          ? 'bg-green-950/60 border border-green-500/50 text-green-400'
                          : rep.status === 'REJECTED'
                          ? 'bg-[#111111] border border-[#292929] text-[#737373]'
                          : 'bg-indigo-950/60 border border-indigo-500/50 text-indigo-400'
                      }`}
                    >
                      {rep.status}
                    </span>
                    <span className="font-semibold text-[#F5F5F5]">Grund: {rep.reason}</span>
                  </div>

                  {rep.description && (
                    <p className="text-[#D1D5DB] bg-[#111111] p-2 rounded border border-[#292929]">
                      &quot;{rep.description}&quot;
                    </p>
                  )}

                  {rep.thread && (
                    <div className="text-[11px] text-[#A3A3A3] flex items-center gap-1.5">
                      <span>Betroffenes Thema:</span>
                      <Link
                        href={`/forum/thread/${rep.thread.id}`}
                        target="_blank"
                        className="text-[#8B5CF6] hover:underline font-medium inline-flex items-center gap-0.5"
                      >
                        <span>{rep.thread.title}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                  )}

                  <div className="text-[10px] text-[#737373] flex items-center gap-3 pt-0.5">
                    <span>Gemeldet von {rep.reporter.username}</span>
                    <span>•</span>
                    <span>Vor {formatTimeAgo(rep.createdAt)}</span>
                    {rep.resolutionNote && (
                      <>
                        <span>•</span>
                        <span className="text-green-400">Notiz: {rep.resolutionNote}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Aktionen */}
                <div className="flex items-center gap-2 shrink-0">
                  {rep.status !== 'RESOLVED' && (
                    <button
                      onClick={() => onResolveReport(rep.id, 'RESOLVED', 'Fall durch Moderation geprüft und gelöst')}
                      className="px-3 py-1.5 bg-green-950/60 hover:bg-green-900 border border-green-500/50 text-green-400 font-semibold rounded text-xs transition"
                    >
                      Als erledigt markieren
                    </button>
                  )}

                  {rep.status !== 'REJECTED' && (
                    <button
                      onClick={() => onResolveReport(rep.id, 'REJECTED', 'Kein Regelverstoß feststellbar')}
                      className="px-3 py-1.5 bg-[#111111] hover:bg-[#202020] border border-[#292929] text-[#A3A3A3] hover:text-[#F5F5F5] rounded text-xs transition"
                    >
                      Abweisen
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
 * 5. VERWARNUNGEN TAB
 * ========================================================================= */
export function ModWarningsView({
  warnings,
  onRevokeWarning,
  onOpenNewWarning,
}: {
  warnings: any[];
  onRevokeWarning: (warningId: string) => Promise<void>;
  onOpenNewWarning: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Info Banner über automatische Regeln */}
      <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-bold text-[#F5F5F5]">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span>Automatische Eskalationsstufen</span>
          </div>
          <p className="text-[11px] text-[#A3A3A3]">
            3 Punkte: Formelle Verwarnung • 5 Punkte: 3 Tage Schreibsperre (Mute) • 10 Punkte: 7 Tage temporäre Kontosperre
          </p>
        </div>
      </div>

      {/* Verwarnungs-Tabelle */}
      <div className="bg-[#161616] border border-[#292929] rounded-[6px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] text-[#A3A3A3] border-b border-[#292929] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Betroffener</th>
                <th className="px-4 py-3">Grund</th>
                <th className="px-4 py-3 text-center">Punkte</th>
                <th className="px-4 py-3">Aussteller</th>
                <th className="px-4 py-3">Datum / Ablauf</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#292929]">
              {warnings.map((w) => (
                <tr key={w.id} className="hover:bg-[#1A1A1A] transition">
                  <td className="px-4 py-3 font-semibold text-[#F5F5F5]">
                    {w.user?.username}
                  </td>
                  <td className="px-4 py-3 text-[#E5E5E5] max-w-xs truncate">
                    <div>{w.reason}</div>
                    {w.internalNote && (
                      <span className="text-[10px] text-[#8B5CF6] italic block">
                        Intern: {w.internalNote}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-amber-400">
                    +{w.points}
                  </td>
                  <td className="px-4 py-3 text-[#A3A3A3]">{w.issuer?.username}</td>
                  <td className="px-4 py-3 text-[#737373] text-[11px] whitespace-nowrap">
                    <div>{formatCustomDate(w.createdAt)}</div>
                    <div>Ablauf: {w.expiresAt ? formatCustomDate(w.expiresAt) : 'Dauerhaft'}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {w.isRevoked ? (
                      <span className="px-2 py-0.5 bg-[#111111] border border-[#292929] text-[#737373] rounded text-[10px]">
                        Zurückgenommen
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-950/60 border border-amber-500/50 text-amber-400 rounded text-[10px] font-bold">
                        Aktiv
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!w.isRevoked && (
                      <button
                        onClick={() => onRevokeWarning(w.id)}
                        className="px-2.5 py-1 text-xs text-[#A3A3A3] hover:text-red-400 bg-[#111111] hover:bg-[#202020] border border-[#292929] rounded transition"
                      >
                        Zurücknehmen
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
 * 6. SPERREN TAB
 * ========================================================================= */
export function ModBansView({
  bans,
  onRevokeBan,
}: {
  bans: any[];
  onRevokeBan: (userId: string, type: 'BAN' | 'MUTE') => Promise<void>;
}) {
  const [filterType, setFilterType] = useState('ALL');

  const filtered = useMemo(() => {
    return bans.filter((b) => {
      if (filterType === 'ACTIVE') return b.isActive;
      if (filterType === 'BAN') return b.type === 'BAN';
      if (filterType === 'MUTE') return b.type === 'MUTE';
      return true;
    });
  }, [bans, filterType]);

  return (
    <div className="space-y-4">
      <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Ban className="w-4 h-4 text-red-500" />
          <h3 className="font-bold text-[#F5F5F5]">Sanktionen & Sperrprotokoll ({filtered.length})</h3>
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-[#101010] border border-[#292929] rounded-[4px] px-3 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
        >
          <option value="ALL">Alle Einträge</option>
          <option value="ACTIVE">Nur Aktive Sperren</option>
          <option value="BAN">Nur Kontosperren</option>
          <option value="MUTE">Nur Schreibsperren</option>
        </select>
      </div>

      <div className="bg-[#161616] border border-[#292929] rounded-[6px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] text-[#A3A3A3] border-b border-[#292929] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Benutzer</th>
                <th className="px-4 py-3">Typ</th>
                <th className="px-4 py-3">Grund</th>
                <th className="px-4 py-3">Aussteller</th>
                <th className="px-4 py-3">Dauer / Ablauf</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#292929]">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-[#1A1A1A] transition">
                  <td className="px-4 py-3 font-semibold text-[#F5F5F5]">
                    {b.user?.username}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        b.type === 'BAN' ? 'bg-red-950/60 border border-red-500/50 text-red-400' : 'bg-amber-950/60 border border-amber-500/50 text-amber-400'
                      }`}
                    >
                      {b.type === 'BAN' ? 'Kontosperre' : 'Mute'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#E5E5E5] max-w-xs truncate">
                    <div>{b.reason}</div>
                    {b.internalNote && (
                      <span className="text-[10px] text-[#737373] italic block">
                        Intern: {b.internalNote}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#A3A3A3]">{b.issuer?.username}</td>
                  <td className="px-4 py-3 text-[#737373] text-[11px] whitespace-nowrap">
                    <div>{formatCustomDate(b.createdAt)}</div>
                    <div>Ablauf: {b.expiresAt ? formatCustomDate(b.expiresAt) : 'Permanent'}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {b.isActive ? (
                      <span className="px-2 py-0.5 bg-red-950/60 border border-red-500/50 text-red-400 rounded text-[10px] font-bold">
                        Aktiv
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-[#111111] border border-[#292929] text-[#737373] rounded text-[10px]">
                        Aufgehoben
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {b.isActive && (
                      <button
                        onClick={() => onRevokeBan(b.userId, b.type)}
                        className="px-2.5 py-1 text-xs text-green-400 bg-green-950/50 hover:bg-green-900 border border-green-500/40 rounded transition"
                      >
                        Aufheben
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
 * 7. MODERATIONSPROTOKOLLE TAB
 * ========================================================================= */
export function ModLogsView({
  auditLogs,
}: {
  auditLogs: any[];
}) {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const modActions = [
    'USER_WARN',
    'USER_WARN_REVOKE',
    'USER_BAN',
    'USER_UNBAN',
    'USER_MUTE',
    'USER_MUTE_REVOKE',
    'THREAD_LOCK',
    'THREAD_UNLOCK',
    'THREAD_PIN',
    'THREAD_UNPIN',
    'THREAD_MOVE',
    'THREAD_SOFT_DELETE',
    'THREAD_RESTORE',
    'POST_SOFT_DELETE',
    'POST_RESTORE',
    'POST_MOD_EDIT',
    'REPORT_UPDATE',
    'REPORT_CREATE',
  ];

  const filtered = useMemo(() => {
    return auditLogs
      .filter((l) => modActions.includes(l.action))
      .filter((l) => {
        const matchesSearch =
          (l.details || '').toLowerCase().includes(search.toLowerCase()) ||
          (l.user?.username || '').toLowerCase().includes(search.toLowerCase());
        const matchesAction = actionFilter === 'ALL' ? true : l.action === actionFilter;
        return matchesSearch && matchesAction;
      });
  }, [auditLogs, search, actionFilter]);

  const handleExportCsv = () => {
    const headers = ['Zeitpunkt', 'Aktion', 'Moderator', 'Details'];
    const rows = filtered.map((l) => [
      new Date(l.createdAt).toLocaleString('de-DE'),
      l.action,
      l.user?.username || 'System',
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vega_crimelife_moderation_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#8B5CF6]" />
          <h3 className="font-bold text-[#F5F5F5]">Moderationsprotokolle ({filtered.length})</h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Protokoll durchsuchen..."
            className="bg-[#101010] border border-[#292929] rounded-[4px] px-3 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6] w-52"
          />

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-[#101010] border border-[#292929] rounded-[4px] px-2.5 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
          >
            <option value="ALL">Alle Aktionen</option>
            <option value="USER_WARN">Verwarnungen</option>
            <option value="USER_BAN">Sperren</option>
            <option value="USER_MUTE">Schreibsperren</option>
            <option value="THREAD_LOCK">Themen-Sperren</option>
            <option value="THREAD_SOFT_DELETE">Themen-Löschungen</option>
            <option value="POST_SOFT_DELETE">Beitrags-Löschungen</option>
            <option value="REPORT_UPDATE">Meldungen</option>
          </select>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white rounded font-medium flex items-center gap-1.5 transition text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV Export</span>
          </button>
        </div>
      </div>

      <div className="bg-[#161616] border border-[#292929] rounded-[6px] overflow-hidden">
        <div className="divide-y divide-[#292929]">
          {filtered.map((log) => (
            <div key={log.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#8B5CF6] text-[11px] uppercase tracking-wider">
                    {log.action}
                  </span>
                  <span className="text-[#F5F5F5]">{log.details}</span>
                </div>
                <div className="text-[10px] text-[#737373]">
                  Moderator: <strong className="text-[#A3A3A3]">{log.user?.username || 'System'}</strong>
                </div>
              </div>
              <span className="text-[11px] text-[#737373] font-mono shrink-0">
                {new Date(log.createdAt).toLocaleString('de-DE')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
