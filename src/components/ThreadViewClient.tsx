'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatTimeAgo, formatCustomDate } from '@/lib/utils';
import PostRenderer from '@/components/PostRenderer';
import {
  ReportModal,
  WarnUserModal,
  MoveThreadModal,
  ChangePrefixModal,
} from '@/components/ModerationModals';
import {
  Pin,
  Lock,
  Bookmark,
  Trash2,
  Send,
  ThumbsUp,
  Quote,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  AlertTriangle,
  Folder,
  RotateCcw,
  Shield,
  MoreVertical,
  Edit,
  Edit3,
  Check,
  EyeOff,
  Archive,
  Tag
} from 'lucide-react';

interface ThreadViewProps {
  thread: any;
  currentUser: any;
  hasBookmarked: boolean;
  userPollVoteId: string | null;
}

export default function ThreadViewClient({
  thread: initialThread,
  currentUser,
  hasBookmarked: initialBookmarked,
  userPollVoteId: initialUserVote,
}: ThreadViewProps) {
  const router = useRouter();
  const [thread, setThread] = useState(initialThread);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [pollVoted, setPollVoted] = useState(initialUserVote);
  const [selectedPollOption, setSelectedPollOption] = useState<string>('');
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  // Nachricht bearbeiten States
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const isArchivedThread = Boolean(thread.forum?.isArchived || thread.forum?.name?.toLowerCase() === 'archiv');

  const [posts, setPosts] = useState(initialThread.posts);

  // Moderations-Modals State
  const [reportModal, setReportModal] = useState<{
    type: 'THREAD' | 'POST';
    id: string;
    title: string;
  } | null>(null);

  const [warnModalUser, setWarnModalUser] = useState<{
    id: string;
    username: string;
  } | null>(null);

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showPrefixModal, setShowPrefixModal] = useState(false);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);

  // Berechtigungen
  const isStaff =
    currentUser?.role?.canModerateForum ||
    currentUser?.role?.canAccessAdmin ||
    (currentUser?.role?.priority || 0) >= 30;

  const canPin = currentUser?.role?.canPinThreads || isStaff;
  const canLock = currentUser?.role?.canCloseThreads || isStaff;
  const canMove = currentUser?.role?.canMoveThreads || isStaff;
  const canDeleteThread = currentUser?.role?.canDeletePosts || isStaff || currentUser?.id === thread.authorId;
  const canModeratePost = currentUser?.role?.canDeletePosts || isStaff;

  // Bookmark Toggle
  const handleToggleBookmark = async () => {
    if (!currentUser) return router.push('/login');
    try {
      const res = await fetch(`/api/threads/${thread.id}/bookmark`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setBookmarked(data.bookmarked);
      }
    } catch {}
  };

  // Moderations-Aktionen für Thema
  const handleTogglePin = async () => {
    try {
      const res = await fetch('/api/moderation/threads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: thread.id,
          action: thread.isPinned ? 'UNPIN' : 'PIN',
        }),
      });
      if (res.ok) {
        setThread({ ...thread, isPinned: !thread.isPinned });
      }
    } catch {}
  };

  const handleToggleLock = async () => {
    try {
      const res = await fetch('/api/moderation/threads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: thread.id,
          action: thread.isLocked ? 'UNLOCK' : 'LOCK',
        }),
      });
      if (res.ok) {
        setThread({ ...thread, isLocked: !thread.isLocked });
      }
    } catch {}
  };

  const handleRejectAndArchive = async () => {
    if (!confirm('Möchtest du dieses Thema ablehnen, schließen und in das Unterforen-Archiv verschieben?')) {
      return;
    }
    setIsRejecting(true);
    try {
      const res = await fetch('/api/moderation/threads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: thread.id,
          action: 'REJECT_AND_ARCHIVE',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setThread((prev: any) => ({
          ...prev,
          isLocked: true,
          prefix: {
            id: 'rejected-auto',
            name: 'Abgelehnt',
            color: '#64748B',
            bgColor: 'rgba(100, 116, 139, 0.2)',
          },
        }));
        router.refresh();
      } else {
        alert(data.error || 'Fehler beim Ablehnen und Archivieren.');
      }
    } catch {
      alert('Netzwerkfehler.');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleDeleteThread = async () => {
    const isSoftDeleted = thread.isDeleted;
    const confirmMsg = isSoftDeleted
      ? 'Möchtest du dieses Thema wiederherstellen?'
      : 'Möchtest du dieses Thema als Moderator löschen?';
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/moderation/threads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: thread.id,
          action: isSoftDeleted ? 'RESTORE' : 'DELETE',
        }),
      });
      if (res.ok) {
        if (isSoftDeleted) {
          setThread({ ...thread, isDeleted: false });
        } else {
          router.push(`/forum/${thread.forumId}`);
        }
      }
    } catch {}
  };

  // Verschieben-Modal öffnen und Kategorien nachladen
  const openMoveModal = async () => {
    try {
      const res = await fetch('/api/forum-meta');
      const data = await res.json();
      if (data.categories) {
        setCategoriesList(data.categories);
        setShowMoveModal(true);
      }
    } catch {}
  };

  // Moderations-Aktionen für Beiträge
  const handleToggleDeletePost = async (postId: string, currentlyDeleted: boolean) => {
    const confirmMsg = currentlyDeleted
      ? 'Möchtest du diesen Beitrag wiederherstellen?'
      : 'Möchtest du diesen Beitrag ausblenden/löschen?';
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/moderation/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          action: currentlyDeleted ? 'RESTORE' : 'DELETE',
        }),
      });
      if (res.ok) {
        setPosts(
          posts.map((p: any) =>
            p.id === postId ? { ...p, isDeleted: !currentlyDeleted } : p
          )
        );
      }
    } catch {}
  };

  // Nachricht bearbeiten speichern
  const handleSaveEdit = async (postId: string) => {
    if (!editContent.trim()) return;
    setIsSavingEdit(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'Fehler beim Bearbeiten des Beitrags.');
      } else {
        setPosts((prev: any[]) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  content: editContent.trim(),
                  updatedAt: new Date().toISOString(),
                }
              : p
          )
        );
        setEditingPostId(null);
        setEditContent('');
      }
    } catch {
      setEditError('Verbindungsfehler beim Speichern des Beitrags.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Like Reaktion
  const handleLike = async (postId: string) => {
    if (!currentUser) return router.push('/login');
    try {
      const res = await fetch(`/api/posts/${postId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'LIKE' }),
      });
      if (res.ok) {
        setPosts(
          posts.map((p: any) => {
            if (p.id !== postId) return p;
            const existingIndex = p.reactions.findIndex(
              (r: any) => r.userId === currentUser.id && r.type === 'LIKE'
            );
            let newReactions = [...p.reactions];
            if (existingIndex >= 0) {
              newReactions.splice(existingIndex, 1);
            } else {
              newReactions.push({
                id: Math.random().toString(),
                postId,
                userId: currentUser.id,
                type: 'LIKE',
                user: currentUser,
              });
            }
            return { ...p, reactions: newReactions };
          })
        );
      }
    } catch {}
  };

  // Umfrage Stimmabgabe
  const handleVotePoll = async () => {
    if (!currentUser) return router.push('/login');
    if (!selectedPollOption) return;
    try {
      const res = await fetch(`/api/threads/${thread.id}/poll/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId: selectedPollOption }),
      });
      if (res.ok) {
        setPollVoted(selectedPollOption);
        router.refresh();
      }
    } catch {}
  };

  // Zitieren
  const handleQuote = (authorName: string, text: string) => {
    const quoted = `> **${authorName} schrieb:**\n> ${text.split('\n').join('\n> ')}\n\n`;
    setReplyContent((prev) => prev + quoted);
    document.getElementById('reply-textarea')?.focus();
  };

  // BB-Code Schnellformatierung
  const insertBBCode = (tagOpen: string, tagClose: string) => {
    const textarea = document.getElementById('reply-textarea') as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = replyContent.substring(start, end);
    const replacement = `${tagOpen}${selectedText}${tagClose}`;
    const newContent = replyContent.substring(0, start) + replacement + replyContent.substring(end);
    setReplyContent(newContent);
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + tagOpen.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  // Antwort abschicken
  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    setSubmittingReply(true);
    setReplyError(null);

    try {
      const res = await fetch(`/api/threads/${thread.id}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent }),
      });

      const data = await res.json();
      if (!res.ok) {
        setReplyError(data.error || 'Fehler beim Antworten.');
      } else {
        setPosts([...posts, { ...data.post, reactions: [] }]);
        setReplyContent('');
        router.refresh();
      }
    } catch {
      setReplyError('Verbindung zum Server fehlgeschlagen.');
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Gelöscht-Banner für Thema */}
      {thread.isDeleted && (
        <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-[6px] text-xs text-red-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>Dieses Thema wurde von der Moderation gelöscht / archiviert.</span>
          </div>
          {isStaff && (
            <button
              onClick={handleDeleteThread}
              className="px-2.5 py-1 bg-[#161616] border border-[#292929] hover:border-red-500 text-white rounded-[4px] transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3 text-[#8B5CF6]" />
              <span>Thema wiederherstellen</span>
            </button>
          )}
        </div>
      )}

      {/* Moderationshinweis bei abgelehntem oder archiviertem Thema */}
      {(thread.prefix?.name === 'Abgelehnt' || thread.prefix?.name === 'Rejected' || isArchivedThread) && (
        <div className="bg-[#141414] border border-[#EF4444]/40 rounded-[6px] p-4 flex items-start gap-3 shadow-sm">
          <div className="w-8 h-8 rounded-[6px] bg-[#EF4444]/15 border border-[#EF4444]/30 flex items-center justify-center shrink-0 mt-0.5">
            <Archive className="w-4 h-4 text-[#EF4444]" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-[#EF4444] text-xs uppercase tracking-wider flex items-center gap-1.5">
                Thema Abgelehnt & Archiviert
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] rounded font-semibold">
                Dauerhaft Geschlossen
              </span>
            </div>
            <p className="text-[#A3A3A3] text-xs leading-relaxed">
              Dieses Thema wurde durch die Moderation abgelehnt, geschlossen und in das zuständige Unterforen-Archiv verschoben. Es können keine weiteren Beiträge verfasst werden.
            </p>
          </div>
        </div>
      )}

      {/* Thread Header Leiste */}
      <div className="bg-[#171717] border border-[#262626] rounded-[6px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {thread.prefix && (
              <span className="px-1.5 py-0.2 rounded-[4px] text-[10px] font-semibold bg-[#111111] text-[#8B5CF6] border border-[#262626]">
                {thread.prefix.name}
              </span>
            )}
            <h1 className="text-base font-bold text-[#F5F5F5]">{thread.title}</h1>
            {isArchivedThread && (
              <span className="px-1.5 py-0.2 bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-[10px] font-semibold rounded-[4px] flex items-center gap-1">
                <Archive className="w-3 h-3" /> Archiviert
              </span>
            )}
            {thread.isPinned && (
              <span className="text-[10px] text-[#8B5CF6] flex items-center gap-1">
                <Pin className="w-3 h-3" /> Angepinnt
              </span>
            )}
            {thread.isLocked && (
              <span className="text-[10px] text-[#999999] flex items-center gap-1">
                <Lock className="w-3 h-3" /> Geschlossen
              </span>
            )}
          </div>
          <div className="text-[11px] text-[#666666] flex items-center gap-2">
            <span>Erstellt von {thread.author.username}</span>
            <span>•</span>
            <span>{formatCustomDate(thread.createdAt)}</span>
            <span>•</span>
            <span>{thread.viewsCount} Aufrufe</span>
          </div>
        </div>

        {/* Schnellaktionen & Moderationsleiste */}
        <div className="flex items-center gap-2 flex-wrap">
          {currentUser && (
            <>
              {/* Bookmark */}
              <button
                onClick={handleToggleBookmark}
                className={`px-2.5 py-1.5 rounded-[6px] border text-xs font-medium transition flex items-center gap-1.5 ${
                  bookmarked
                    ? 'bg-[#111111] border-[#8B5CF6] text-[#8B5CF6]'
                    : 'bg-[#111111] border-[#262626] text-[#999999] hover:text-[#F5F5F5]'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{bookmarked ? 'Gespeichert' : 'Speichern'}</span>
              </button>

              {/* Thema melden */}
              <button
                onClick={() =>
                  setReportModal({
                    type: 'THREAD',
                    id: thread.id,
                    title: thread.title,
                  })
                }
                className="px-2.5 py-1.5 rounded-[6px] border border-[#262626] bg-[#111111] text-xs text-[#999999] hover:text-amber-400 transition flex items-center gap-1.5"
                title="Thema melden"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Melden</span>
              </button>
            </>
          )}

          {/* Moderationsleiste für Teammitglieder */}
          {isStaff && (
            <div className="flex items-center gap-1 bg-[#111111] p-1 rounded-[6px] border border-[#8B5CF6]/40">
              <span className="px-1.5 text-[10px] font-bold text-[#8B5CF6] flex items-center gap-1 uppercase tracking-wider">
                <Shield className="w-3 h-3" />
                <span className="hidden md:inline">Mod</span>
              </span>

              {/* Ablehnen & Archivieren Button */}
              <button
                onClick={handleRejectAndArchive}
                disabled={isRejecting}
                className="px-2 py-1 bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/30 rounded-[4px] text-[11px] font-medium transition flex items-center gap-1 shrink-0 disabled:opacity-50"
                title="Thema ablehnen, schließen und in das Unterforen-Archiv verschieben"
              >
                <Archive className="w-3 h-3" />
                <span className="hidden sm:inline">{isRejecting ? 'Archiviere...' : 'Ablehnen & Archivieren'}</span>
              </button>

              {/* Präfix ändern Button */}
              <button
                onClick={() => setShowPrefixModal(true)}
                className="px-2 py-1 bg-[#161616] hover:bg-[#202020] text-[#A3A3A3] hover:text-[#F5F5F5] border border-[#292929] rounded-[4px] text-[11px] font-medium transition flex items-center gap-1 shrink-0"
                title="Themen-Präfix ändern"
              >
                <Tag className="w-3 h-3 text-[#8B5CF6]" />
                <span className="hidden sm:inline">Präfix</span>
              </button>

              {canPin && (
                <button
                  onClick={handleTogglePin}
                  className={`p-1.5 rounded-[4px] transition ${
                    thread.isPinned ? 'text-[#8B5CF6]' : 'text-[#999999] hover:text-[#F5F5F5]'
                  }`}
                  title={thread.isPinned ? 'Entpinnen' : 'Anpinnen'}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
              )}

              {canLock && (
                <button
                  onClick={handleToggleLock}
                  className={`p-1.5 rounded-[4px] transition ${
                    thread.isLocked ? 'text-[#8B5CF6]' : 'text-[#999999] hover:text-[#F5F5F5]'
                  }`}
                  title={thread.isLocked ? 'Öffnen' : 'Schließen'}
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
              )}

              {canMove && (
                <button
                  onClick={openMoveModal}
                  className="p-1.5 text-[#999999] hover:text-[#8B5CF6] rounded-[4px] transition"
                  title="Thema verschieben"
                >
                  <Folder className="w-3.5 h-3.5" />
                </button>
              )}

              {canDeleteThread && (
                <button
                  onClick={handleDeleteThread}
                  className="p-1.5 text-[#999999] hover:text-red-400 rounded-[4px] transition"
                  title={thread.isDeleted ? 'Wiederherstellen' : 'Löschen'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Umfrage (falls vorhanden) */}
      {thread.poll && (
        <div className="bg-[#171717] border border-[#262626] rounded-[6px] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#262626] pb-2">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#8B5CF6]" />
              <h3 className="text-xs font-bold text-[#F5F5F5] uppercase">
                Umfrage: {thread.poll.question}
              </h3>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            {thread.poll.options.map((opt: any) => {
              const totalVotes =
                thread.poll.options.reduce((acc: number, curr: any) => acc + curr.votesCount, 0) || 1;
              const percentage = Math.round((opt.votesCount / totalVotes) * 100);
              const isSelected = pollVoted === opt.id;

              return (
                <div key={opt.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer text-[#F5F5F5]">
                      {!pollVoted && (
                        <input
                          type="radio"
                          name="poll"
                          value={opt.id}
                          checked={selectedPollOption === opt.id}
                          onChange={() => setSelectedPollOption(opt.id)}
                          className="accent-[#8B5CF6]"
                        />
                      )}
                      <span className={isSelected ? 'text-[#8B5CF6] font-semibold' : ''}>
                        {opt.text}
                      </span>
                    </label>
                    <span className="text-[11px] text-[#666666]">
                      {opt.votesCount} Stimmen ({percentage}%)
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-[#111111] rounded-full overflow-hidden border border-[#262626]">
                    <div
                      className={`h-full rounded-full ${
                        isSelected ? 'bg-[#8B5CF6]' : 'bg-[#333333]'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          {!pollVoted && currentUser && (
            <button
              onClick={handleVotePoll}
              disabled={!selectedPollOption}
              className="mt-2 px-3 py-1.5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-medium rounded-[6px] transition disabled:opacity-50"
            >
              Abstimmen
            </button>
          )}
        </div>
      )}

      {/* Beiträge Liste */}
      <div className="space-y-3">
        {posts.map((post: any, index: number) => {
          const isLikedByMe = post.reactions?.some(
            (r: any) => r.userId === currentUser?.id && r.type === 'LIKE'
          );
          const likeCount = post.reactions?.filter((r: any) => r.type === 'LIKE').length || 0;

          return (
            <div
              key={post.id}
              id={`post-${post.id}`}
              className={`bg-[#171717] border rounded-[6px] overflow-hidden flex flex-col md:flex-row text-xs transition ${
                post.isDeleted ? 'border-red-500/40 opacity-75' : 'border-[#262626]'
              }`}
            >
              {/* Benutzerbox links */}
              <div className="w-full md:w-44 bg-[#111111] p-3.5 border-b md:border-b-0 md:border-r border-[#262626] flex md:flex-col items-center text-center gap-2.5 shrink-0">
                <img
                  src={
                    post.author.avatarUrl ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                  }
                  alt=""
                  className="w-12 h-12 rounded-[6px] object-cover border border-[#262626]"
                />

                <div className="space-y-0.5 text-left md:text-center">
                  <Link
                    href={`/user/${post.author.username}`}
                    className="font-semibold text-xs text-[#F5F5F5] hover:text-[#8B5CF6] transition block"
                  >
                    {post.author.username}
                  </Link>

                  <span className="inline-block text-[10px] font-medium text-[#8B5CF6]">
                    {post.author.role?.displayName}
                  </span>

                  <div className="text-[10px] text-[#666666] pt-1 hidden md:block">
                    <div>Registriert: {formatCustomDate(post.author.createdAt, 'MM/yyyy')}</div>
                  </div>
                </div>
              </div>

              {/* Beitragsinhalt rechts */}
              <div className="flex-1 p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[#666666] border-b border-[#262626] pb-1.5">
                    <div className="flex items-center gap-2">
                      <span>{formatCustomDate(post.createdAt)}</span>
                      {post.updatedAt &&
                        new Date(post.updatedAt).getTime() > new Date(post.createdAt).getTime() + 1000 && (
                          <span className="text-[10px] text-[#737373] italic">(bearbeitet)</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                      {post.isDeleted && (
                        <span className="px-1.5 py-0.2 bg-red-950/60 border border-red-500/50 text-red-400 rounded text-[10px] font-semibold">
                          Gelöscht
                        </span>
                      )}
                      <span>#{index + 1}</span>
                    </div>
                  </div>

                  {editingPostId === post.id ? (
                    <div className="space-y-2.5 pt-1">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={4}
                        className="w-full p-3 bg-[#111111] border border-[#292929] rounded-[6px] text-xs text-[#F5F5F5] focus:outline-none focus:border-white leading-relaxed resize-y"
                        placeholder="Beitrag bearbeiten..."
                      />
                      {editError && (
                        <p className="text-[11px] text-red-400">{editError}</p>
                      )}
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPostId(null);
                            setEditContent('');
                            setEditError(null);
                          }}
                          disabled={isSavingEdit}
                          className="h-7 px-3 bg-[#111111] hover:bg-[#222222] text-[#A3A3A3] hover:text-[#F5F5F5] border border-[#292929] rounded-[4px] text-xs transition"
                        >
                          Abbrechen
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(post.id)}
                          disabled={isSavingEdit || !editContent.trim()}
                          className="h-7 px-3.5 bg-white hover:bg-neutral-200 text-black font-semibold rounded-[4px] text-xs transition disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {isSavingEdit ? (
                            <span>Speichern...</span>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Speichern</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : post.isDeleted && !isStaff ? (
                    <div className="p-3 bg-[#111111] border border-[#262626] rounded text-[#737373] italic">
                      Dieser Beitrag wurde durch die Moderation entfernt.
                    </div>
                  ) : (
                    <div className="text-xs text-[#F5F5F5] leading-relaxed">
                      <PostRenderer content={post.content} />
                    </div>
                  )}
                </div>

                {/* Fußzeile mit Like, Zitieren, Bearbeiten, Melden & Moderation */}
                <div className="flex items-center justify-between pt-2 border-t border-[#262626] text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`px-2 py-1 rounded-[4px] border text-xs font-medium transition flex items-center gap-1.5 ${
                        isLikedByMe
                          ? 'bg-[#111111] border-[#8B5CF6] text-[#8B5CF6]'
                          : 'bg-[#111111] border-[#262626] text-[#999999] hover:text-[#F5F5F5]'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>Gefällt mir</span>
                      {likeCount > 0 && <span className="text-[#8B5CF6]">({likeCount})</span>}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Bearbeiten */}
                    {currentUser &&
                      (currentUser.id === post.authorId || isStaff) &&
                      !post.isDeleted &&
                      !thread.isLocked && (
                        <button
                          onClick={() => {
                            setEditingPostId(post.id);
                            setEditContent(post.content);
                            setEditError(null);
                          }}
                          className="px-2 py-1 text-[#999999] hover:text-white text-xs font-medium transition flex items-center gap-1"
                          title="Nachricht bearbeiten"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Bearbeiten</span>
                        </button>
                      )}

                    {/* Melden */}
                    {currentUser && currentUser.id !== post.authorId && (
                      <button
                        onClick={() =>
                          setReportModal({
                            type: 'POST',
                            id: post.id,
                            title: `Beitrag #${index + 1} von ${post.author.username}`,
                          })
                        }
                        className="px-2 py-1 text-[#666666] hover:text-amber-400 text-xs font-medium transition flex items-center gap-1"
                        title="Beitrag melden"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Melden</span>
                      </button>
                    )}

                    {/* Zitieren */}
                    {currentUser && !thread.isLocked && !post.isDeleted && (
                      <button
                        onClick={() => handleQuote(post.author.username, post.content)}
                        className="px-2 py-1 text-[#999999] hover:text-[#F5F5F5] text-xs font-medium transition flex items-center gap-1"
                      >
                        <Quote className="w-3.5 h-3.5" />
                        <span>Zitieren</span>
                      </button>
                    )}

                    {/* Moderationsaktionen für Team */}
                    {isStaff && (
                      <div className="flex items-center gap-1 pl-2 border-l border-[#262626]">
                        {/* Autor verwarnen */}
                        {currentUser.id !== post.authorId && (
                          <button
                            onClick={() =>
                              setWarnModalUser({
                                id: post.authorId,
                                username: post.author.username,
                              })
                            }
                            className="p-1 text-[#666666] hover:text-amber-400 rounded transition"
                            title="Autor verwarnen"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Beitrag löschen / wiederherstellen */}
                        {canModeratePost && (
                          <button
                            onClick={() => handleToggleDeletePost(post.id, Boolean(post.isDeleted))}
                            className={`p-1 rounded transition ${
                              post.isDeleted
                                ? 'text-green-400 hover:text-green-300'
                                : 'text-[#666666] hover:text-red-400'
                            }`}
                            title={post.isDeleted ? 'Wiederherstellen' : 'Ausblenden'}
                          >
                            {post.isDeleted ? (
                              <RotateCcw className="w-3.5 h-3.5" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Antwortformular */}
      {isArchivedThread ? (
        <div className="bg-[#111111] border border-[#EF4444]/30 rounded-[6px] p-4 text-center text-xs text-[#A3A3A3] flex items-center justify-center gap-2">
          <Archive className="w-4 h-4 text-[#EF4444] shrink-0" />
          <span>Dieses Thema befindet sich im Archiv und ist dauerhaft schreibgeschützt. Niemand kann hier Antworten verfassen.</span>
        </div>
      ) : !thread.isLocked ? (
        currentUser ? (
          currentUser.isMuted ? (
            <div className="bg-[#171717] border border-amber-500/40 rounded-[6px] p-4 text-xs text-amber-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                Dein Konto hat derzeit eine aktive Schreibsperre (Mute). Du kannst vorübergehend keine Antworten verfassen.
              </span>
            </div>
          ) : (
            <div className="bg-[#171717] border border-[#262626] rounded-[6px] p-4 space-y-3">
              <h3 className="text-xs font-bold text-[#F5F5F5] uppercase">
                Antwort verfassen
              </h3>

              {replyError && (
                <div className="p-2.5 bg-[#111111] border border-red-500/40 text-red-400 text-xs rounded-[6px]">
                  {replyError}
                </div>
              )}

              <form onSubmit={handleSubmitReply} className="space-y-3">
                <div className="space-y-0">
                  {/* BB-Code Schnellformatierungsleiste */}
                  <div className="flex items-center gap-1 p-1.5 bg-[#111111] border border-[#262626] rounded-t-[6px] border-b-0 text-xs flex-wrap">
                    <button
                      type="button"
                      onClick={() => insertBBCode('[B]', '[/B]')}
                      className="px-2 py-0.5 rounded text-[11px] font-bold text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#1D1D1D] transition"
                      title="Fett [B]"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => insertBBCode('[I]', '[/I]')}
                      className="px-2 py-0.5 rounded text-[11px] italic font-serif text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#1D1D1D] transition"
                      title="Kursiv [I]"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => insertBBCode('[U]', '[/U]')}
                      className="px-2 py-0.5 rounded text-[11px] underline text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#1D1D1D] transition"
                      title="Unterstrichen [U]"
                    >
                      U
                    </button>
                    <div className="w-px h-3.5 bg-[#292929] mx-1" />
                    <button
                      type="button"
                      onClick={() => insertBBCode('[QUOTE]', '[/QUOTE]')}
                      className="px-2 py-0.5 rounded text-[10px] uppercase font-mono text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#1D1D1D] transition"
                      title="Zitat [QUOTE]"
                    >
                      Zitat
                    </button>
                    <button
                      type="button"
                      onClick={() => insertBBCode('[CODE]', '[/CODE]')}
                      className="px-2 py-0.5 rounded text-[10px] uppercase font-mono text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#1D1D1D] transition"
                      title="Code-Block [CODE]"
                    >
                      Code
                    </button>
                    <button
                      type="button"
                      onClick={() => insertBBCode('[SPOILER]', '[/SPOILER]')}
                      className="px-2 py-0.5 rounded text-[10px] uppercase font-mono text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#1D1D1D] transition"
                      title="Spoiler verbergen [SPOILER]"
                    >
                      Spoiler
                    </button>
                  </div>

                  <textarea
                    id="reply-textarea"
                    rows={4}
                    required
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Schreibe eine Antwort... (BB-Code und Markdown werden unterstützt)"
                    className="w-full bg-[#111111] border border-[#262626] rounded-b-[6px] rounded-t-none p-3 text-xs text-[#F5F5F5] placeholder-[#666666] focus:outline-none focus:border-[#8B5CF6]"
                  ></textarea>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingReply}
                    className="px-4 py-1.5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-medium rounded-[6px] transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingReply ? 'Wird gesendet...' : 'Antworten'}</span>
                  </button>
                </div>
              </form>
            </div>
          )
        ) : (
          <div className="bg-[#171717] border border-[#262626] rounded-[6px] p-4 text-center text-xs text-[#999999]">
            <Link href="/login" className="text-[#8B5CF6] hover:underline font-medium">
              Melde dich an
            </Link>
            , um auf dieses Thema zu antworten.
          </div>
        )
      ) : (
        <div className="bg-[#171717] border border-[#262626] rounded-[6px] p-3 text-center text-xs text-[#999999] flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-[#8B5CF6]" />
          <span>Dieses Thema ist geschlossen.</span>
        </div>
      )}

      {/* MODERATIONS MODALS */}
      {reportModal && (
        <ReportModal
          isOpen={true}
          onClose={() => setReportModal(null)}
          type={reportModal.type}
          targetId={reportModal.id}
          targetTitle={reportModal.title}
        />
      )}

      {warnModalUser && (
        <WarnUserModal
          isOpen={true}
          onClose={() => setWarnModalUser(null)}
          targetUser={warnModalUser}
        />
      )}

      {showMoveModal && (
        <MoveThreadModal
          isOpen={true}
          onClose={() => setShowMoveModal(false)}
          threadId={thread.id}
          threadTitle={thread.title}
          currentForumId={thread.forumId}
          categories={categoriesList}
          onSuccess={() => router.refresh()}
        />
      )}

      {showPrefixModal && (
        <ChangePrefixModal
          isOpen={true}
          onClose={() => setShowPrefixModal(false)}
          threadId={thread.id}
          threadTitle={thread.title}
          currentPrefixId={thread.prefix?.id || null}
          onSuccess={(updatedThread) => {
            if (updatedThread) {
              setThread((prev: any) => ({
                ...prev,
                ...updatedThread,
              }));
            }
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
