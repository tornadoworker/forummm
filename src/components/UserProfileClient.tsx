'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatTimeAgo, formatCustomDate } from '@/lib/utils';
import {
  ReportModal,
  WarnUserModal,
  BanUserModal,
} from '@/components/ModerationModals';
import {
  User,
  Settings,
  Send,
  MessageSquare,
  ThumbsUp,
  Clock,
  Shield,
  AlertTriangle,
  AlertCircle,
  Ban,
  MicOff,
  UserX
} from 'lucide-react';

interface UserProfileProps {
  profileUser: any;
  currentUser: any;
  stats: {
    threadsCount: number;
    postsCount: number;
    reactionsReceived: number;
  };
}

export default function UserProfileClient({
  profileUser,
  currentUser,
  stats,
}: UserProfileProps) {
  const router = useRouter();
  const [profilePosts, setProfilePosts] = useState<any[]>(profileUser.profilePosts || []);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [showReportModal, setShowReportModal] = useState(false);
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banType, setBanType] = useState<'BAN' | 'MUTE'>('BAN');

  const isOwnProfile = currentUser?.id === profileUser.id;
  const isStaff =
    currentUser?.role?.canModerateForum ||
    currentUser?.role?.canAccessAdmin ||
    (currentUser?.role?.priority || 0) >= 30;

  const [postFeedback, setPostFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !currentUser) return;
    setSubmitting(true);
    setPostFeedback(null);

    try {
      const res = await fetch(`/api/user/${profileUser.username}/profile-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();
      if (res.ok) {
        setProfilePosts([data.message, ...profilePosts]);
        setContent('');
        setPostFeedback({ type: 'success', text: 'Profilnachricht wurde veröffentlicht.' });
        setTimeout(() => setPostFeedback(null), 4000);
      } else {
        setPostFeedback({ type: 'error', text: data.error || 'Fehler beim Senden der Nachricht.' });
      }
    } catch {
      setPostFeedback({ type: 'error', text: 'Verbindung zum Server fehlgeschlagen.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status-Hinweise bei Sperre oder Schreibsperre */}
      {profileUser.isBanned && (
        <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-[6px] text-xs text-red-400 flex items-center gap-2">
          <Ban className="w-4 h-4 text-red-400 shrink-0" />
          <span>
            Dieses Benutzerkonto ist derzeit gesperrt. Grund: &quot;{profileUser.banReason || 'Regelverstoß'}&quot;.
          </span>
        </div>
      )}

      {profileUser.isMuted && (
        <div className="p-3 bg-amber-950/40 border border-amber-500/50 rounded-[6px] text-xs text-amber-400 flex items-center gap-2">
          <MicOff className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Dieser Benutzer hat eine aktive Schreibsperre (Mute).
          </span>
        </div>
      )}

      {/* Profil Header Karte mit Banner */}
      <div className="bg-[#171717] border border-[#262626] rounded-[6px] overflow-hidden">
        {/* Profilbanner */}
        <div className="relative h-36 sm:h-48 w-full bg-[#111111] border-b border-[#262626] overflow-hidden">
          {profileUser.bannerUrl ? (
            <img
              src={profileUser.bannerUrl}
              alt={`${profileUser.username} Banner`}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-[#141022] via-[#1b1230] to-[#121216] flex items-center justify-center">
              <img
                src="/default-banner.png"
                alt="Vega Crimelife Banner"
                className="w-full h-full object-cover object-center opacity-45"
              />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#171717]/90 via-transparent to-transparent pointer-events-none" />
        </div>

        <div className="p-5 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-8 sm:-mt-10 relative z-10">
            <div className="flex items-end gap-4">
              <img
                src={
                  profileUser.avatarUrl ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'
                }
                alt={profileUser.username}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-[8px] object-cover border-2 border-[#171717] shadow-xl bg-[#111111]"
              />
              <div className="space-y-1 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-[#F5F5F5]">
                    {profileUser.displayName || profileUser.username}
                  </h1>
                  {profileUser.displayName && profileUser.displayName !== profileUser.username && (
                    <span className="text-xs text-[#737373]">@{profileUser.username}</span>
                  )}
                  <span className="text-xs text-[#8B5CF6] font-medium">
                    {profileUser.role.displayName}
                  </span>

                  {/* Verwarnungspunkte Badge für Staff */}
                  {isStaff && profileUser.warningPoints > 0 && (
                    <span className="px-2 py-0.5 bg-amber-950/60 border border-amber-500/50 text-amber-400 text-[10px] font-bold rounded-[3px]">
                      {profileUser.warningPoints} VP
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#888888] flex items-center gap-3 flex-wrap">
                  <span>Registriert: {formatCustomDate(profileUser.createdAt, 'dd.MM.yyyy')}</span>
                  <span>•</span>
                  <span>Zuletzt aktiv: {formatTimeAgo(profileUser.lastActiveAt)}</span>
                </div>
              </div>
            </div>

            {/* Aktionsleiste Rechts */}
            <div className="flex items-center gap-2 flex-wrap self-start sm:self-end pb-1">
              {/* Profil bearbeiten Button für eigenen Account */}
              {isOwnProfile && (
                <Link
                  href="/settings"
                  className="px-3 py-1.5 bg-[#111111] hover:bg-[#1F1F1F] text-[#F5F5F5] border border-[#262626] text-xs font-medium rounded-[6px] transition inline-flex items-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5 text-[#999999]" />
                  <span>Einstellungen</span>
                </Link>
              )}

              {/* Benutzer melden */}
              {currentUser && !isOwnProfile && (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="px-3 py-1.5 bg-[#111111] hover:bg-[#1F1F1F] text-[#A3A3A3] hover:text-amber-400 border border-[#262626] text-xs font-medium rounded-[6px] transition inline-flex items-center gap-1.5"
                  title="Benutzerprofil melden"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Melden</span>
                </button>
              )}

              {/* Moderationsaktionen für Staff */}
              {isStaff && !isOwnProfile && (
                <div className="flex items-center gap-1 bg-[#111111] p-1 rounded-[6px] border border-[#8B5CF6]/40">
                  <button
                    onClick={() => setShowWarnModal(true)}
                    className="px-2 py-1 text-xs text-amber-400 hover:text-amber-300 hover:bg-[#1f1f1f] rounded transition flex items-center gap-1"
                    title="Benutzer verwarnen"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Verwarnen</span>
                  </button>

                  <button
                    onClick={() => {
                      setBanType('MUTE');
                      setShowBanModal(true);
                    }}
                    className="px-2 py-1 text-xs text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#1f1f1f] rounded transition flex items-center gap-1"
                    title="Schreibsperre verhängen"
                  >
                    <MicOff className="w-3.5 h-3.5" />
                    <span>Mute</span>
                  </button>

                  <button
                    onClick={() => {
                      setBanType('BAN');
                      setShowBanModal(true);
                    }}
                    className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-[#1f1f1f] rounded transition flex items-center gap-1"
                    title="Benutzer sperren"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Sperren</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Biografie */}
          {profileUser.bio && (
            <div className="mt-4 pt-3 border-t border-[#262626] text-xs text-[#999999] leading-relaxed">
              {profileUser.bio}
            </div>
          )}
        </div>
      </div>

      {/* Grid: Links Pinnwand, Rechts Statistiken */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* PINNWAND (2 SPALTEN) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#171717] border border-[#262626] rounded-[6px] p-4 space-y-3">
            <h3 className="text-xs font-bold text-[#F5F5F5] uppercase">
              Profilnachrichten
            </h3>

            {postFeedback && (
              <div
                className={`p-2.5 rounded-[6px] text-xs border ${
                  postFeedback.type === 'success'
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400'
                    : 'bg-red-950/30 border-red-500/40 text-red-400'
                }`}
              >
                {postFeedback.text}
              </div>
            )}

            {currentUser ? (
              <form onSubmit={handlePostMessage} className="space-y-2">
                <textarea
                  rows={2}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`Nachricht an ${profileUser.username} schreiben...`}
                  className="w-full bg-[#111111] border border-[#262626] rounded-[6px] p-2.5 text-xs text-[#F5F5F5] placeholder-[#666666] focus:outline-none focus:border-[#8B5CF6]"
                ></textarea>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-3 py-1.5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-medium rounded-[6px] transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3 h-3" />
                    <span>Posten</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-xs text-[#999999] text-center py-2">
                <Link href="/login" className="text-[#8B5CF6] hover:underline">
                  Melde dich an
                </Link>
                , um eine Nachricht zu hinterlassen.
              </div>
            )}

            {/* Nachrichten-Liste */}
            <div className="space-y-3 pt-2">
              {profilePosts.length === 0 ? (
                <div className="text-xs text-[#666666] text-center py-4">
                  Bisher keine Profilnachrichten vorhanden.
                </div>
              ) : (
                profilePosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-3 bg-[#111111] border border-[#262626] rounded-[6px] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={
                            post.author.avatarUrl ||
                            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'
                          }
                          alt=""
                          className="w-6 h-6 rounded-[4px] object-cover border border-[#262626]"
                        />
                        <Link
                          href={`/user/${post.author.username}`}
                          className="font-semibold text-xs text-[#F5F5F5] hover:text-[#8B5CF6] transition"
                        >
                          {post.author.username}
                        </Link>
                        <span className="text-[10px] text-[#8B5CF6]">
                          {post.author.role?.displayName}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#666666]">
                        {formatTimeAgo(post.createdAt)}
                      </span>
                    </div>

                    <div className="text-[#F5F5F5] pl-8 leading-relaxed whitespace-pre-line">
                      {post.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* SIDEBAR RECHTS: STATISTIKEN */}
        <div className="space-y-4">
          <div className="bg-[#171717] border border-[#262626] rounded-[6px] p-4 space-y-3">
            <h3 className="text-xs font-bold text-[#F5F5F5] uppercase">
              Statistiken
            </h3>

            <div className="space-y-2 text-xs divide-y divide-[#262626]">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[#999999] flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Themen</span>
                </span>
                <span className="font-semibold text-[#F5F5F5]">{stats.threadsCount}</span>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-[#999999] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Beiträge</span>
                </span>
                <span className="font-semibold text-[#F5F5F5]">{stats.postsCount}</span>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-[#999999] flex items-center gap-1.5">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Reaktionen</span>
                </span>
                <span className="font-semibold text-[#8B5CF6]">
                  {stats.reactionsReceived}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODERATIONS MODALS */}
      {showReportModal && (
        <ReportModal
          isOpen={true}
          onClose={() => setShowReportModal(false)}
          type="USER"
          targetId={profileUser.id}
          targetTitle={`Benutzerprofil: ${profileUser.username}`}
        />
      )}

      {showWarnModal && (
        <WarnUserModal
          isOpen={true}
          onClose={() => setShowWarnModal(false)}
          targetUser={{ id: profileUser.id, username: profileUser.username }}
          onSuccess={() => router.refresh()}
        />
      )}

      {showBanModal && (
        <BanUserModal
          isOpen={true}
          onClose={() => setShowBanModal(false)}
          targetUser={{ id: profileUser.id, username: profileUser.username }}
          defaultType={banType}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
