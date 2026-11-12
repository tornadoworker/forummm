import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatTimeAgo, formatCustomDate } from '@/lib/utils';
import { Users, Search } from 'lucide-react';

export const revalidate = 0;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { role: { displayName: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {},
    include: {
      role: true,
      _count: {
        select: {
          threads: true,
          posts: true,
        },
      },
    },
    orderBy: [{ role: { priority: 'desc' } }, { lastActiveAt: 'desc' }],
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#171717] border border-[#262626] rounded-[6px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-[#F5F5F5]">Mitglieder</h1>
          <p className="text-xs text-[#999999]">
            Übersicht aller registrierten Mitglieder der Community.
          </p>
        </div>

        <form className="w-full sm:w-60">
          <div className="relative">
            <input
              type="text"
              name="q"
              defaultValue={q || ''}
              placeholder="Mitglied suchen..."
              className="w-full bg-[#111111] border border-[#262626] rounded-[6px] px-3 py-1.5 pl-8 text-xs text-[#F5F5F5] placeholder-[#666666] focus:outline-none focus:border-[#8B5CF6]"
            />
            <Search className="w-3.5 h-3.5 text-[#666666] absolute left-2.5 top-2" />
          </div>
        </form>
      </div>

      {/* Mitglieder Tabelle */}
      <div className="bg-[#171717] border border-[#262626] rounded-[6px] overflow-hidden text-xs">
        <div className="bg-[#111111] px-4 py-2 border-b border-[#262626] text-[11px] font-semibold text-[#999999] uppercase">
          Mitglieder ({users.length})
        </div>

        <div className="divide-y divide-[#262626]">
          {users.map((u) => (
            <div
              key={u.id}
              className="p-3.5 hover:bg-[#1F1F1F]/40 transition flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={
                    u.avatarUrl ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80'
                  }
                  alt=""
                  className="w-9 h-9 rounded-[4px] object-cover border border-[#262626]"
                />
                <div className="min-w-0">
                  <Link
                    href={`/user/${u.username}`}
                    className="font-semibold text-xs text-[#F5F5F5] hover:text-[#8B5CF6] transition block truncate"
                  >
                    {u.username}
                  </Link>
                  <span className="text-[10px] text-[#8B5CF6] font-medium">
                    {u.role.displayName}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6 text-[11px] text-[#999999] shrink-0">
                <div className="text-center min-w-[50px]">
                  <span className="text-[#666666] block text-[10px]">Beiträge</span>
                  <span className="font-medium text-[#F5F5F5]">{u._count.posts}</span>
                </div>
                <div className="text-right min-w-[90px] hidden sm:block">
                  <span className="text-[#666666] block text-[10px]">Zuletzt aktiv</span>
                  <span className="text-[#F5F5F5]">{formatTimeAgo(u.lastActiveAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
