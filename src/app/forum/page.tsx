import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import ForumChannelRow from '@/components/ForumChannelRow';
import { formatTimeAgo } from '@/lib/utils';
import { Plus } from 'lucide-react';

export const revalidate = 0;

export default async function ForumOverviewPage() {
  const [
    currentUser,
    categories,
    recentThreads,
    activeMembers,
    totalThreads,
    totalPosts,
    totalUsers,
  ] = await Promise.all([
    getCurrentUser(),
    prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: {
        forums: {
          where: { parentId: null, isArchived: false },
          orderBy: { order: 'asc' },
          include: {
            subforums: {
              orderBy: { order: 'asc' },
              select: { id: true, name: true, description: true },
            },
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
            _count: {
              select: { threads: true },
            },
          },
        },
      },
    }),
    prisma.thread.findMany({
      where: { isDeleted: false },
      include: {
        author: { include: { role: true } },
        forum: true,
        prefix: true,
        _count: { select: { posts: true } },
      },
      orderBy: { lastActivityAt: 'desc' },
      take: 5,
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
  ]);

  return (
    <div className="space-y-5">
      {/* Kopfzeile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#292929]">
        <div>
          <h1 className="text-[20px] font-bold text-[#F5F5F5]">Forenkanäle</h1>
          <p className="text-[13px] text-[#A3A3A3]">
            Übersicht aller aktiven Forenkanäle und Unterforen von Vega Crimelife.
          </p>
        </div>

        {currentUser?.role.canCreateThreads && (
          <Link
            href="/forum/new"
            className="self-start sm:self-auto h-9 px-3.5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-[13px] font-medium rounded-[6px] transition inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Neues Thema</span>
          </Link>
        )}
      </div>

      {/* Klassisches Zweispaltenlayout: Forenkanäle (72%) & Sidebar (28%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Forenkanäle Container (Genau wie im Screenshot) */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-[#161616] border border-[#292929] rounded-[8px] overflow-hidden shadow-sm"
            >
              {/* Forenkanäle Liste */}
              <div className="divide-y divide-[#292929]">
                {cat.forums.map((forum) => (
                  <ForumChannelRow key={forum.id} forum={forum} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Rechte Sidebar */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-5">
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
                Mein Profil
              </Link>
            </div>
          ) : (
            <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-4 space-y-3 text-xs">
              <div>
                <h3 className="font-semibold text-sm text-[#F5F5F5]">Anmelden</h3>
                <p className="text-[12px] text-[#A3A3A3] mt-1 leading-relaxed">
                  Melde dich an, um Themen zu verfassen und zu diskutieren.
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

          {/* Neueste Themen */}
          <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-4 space-y-2.5">
            <h3 className="text-[13px] font-semibold text-[#F5F5F5] border-b border-[#292929] pb-2">
              Neueste Themen
            </h3>
            <div className="space-y-2.5 text-xs">
              {recentThreads.length > 0 ? (
                recentThreads.map((th) => (
                  <div key={th.id} className="space-y-0.5">
                    <Link
                      href={`/forum/thread/${th.id}`}
                      className="font-medium text-[#F5F5F5] hover:text-[#8B5CF6] transition block truncate"
                    >
                      {th.title}
                    </Link>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#737373]">
                      <span>{th.forum.name}</span>
                      <span>•</span>
                      <span>{th.author.username}</span>
                      <span>•</span>
                      <span>{formatTimeAgo(th.createdAt)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-[11px] text-[#737373] block">Keine Themen vorhanden.</span>
              )}
            </div>
          </div>

          {/* Mitglieder online */}
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

          {/* Forenstatistiken */}
          <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-4 space-y-2 text-xs">
            <h3 className="text-[13px] font-semibold text-[#F5F5F5] border-b border-[#292929] pb-2">
              Forenstatistiken
            </h3>
            <div className="space-y-1.5 pt-1 text-[12px]">
              <div className="flex justify-between text-[#A3A3A3]">
                <span>Themen</span>
                <span className="font-semibold text-[#F5F5F5]">{totalThreads}</span>
              </div>
              <div className="flex justify-between text-[#A3A3A3]">
                <span>Beiträge</span>
                <span className="font-semibold text-[#F5F5F5]">{totalPosts}</span>
              </div>
              <div className="flex justify-between text-[#A3A3A3]">
                <span>Mitglieder</span>
                <span className="font-semibold text-[#F5F5F5]">{totalUsers}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
