import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatTimeAgo } from '@/lib/utils';
import { Bookmark } from 'lucide-react';

export const revalidate = 0;

export default async function BookmarksPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login?callback=/bookmarks');
  }

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: currentUser.id },
    include: {
      thread: {
        include: {
          author: { include: { role: true } },
          forum: true,
          prefix: true,
          _count: { select: { posts: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="w-full space-y-4 max-w-4xl mx-auto">
      <div className="bg-[#171717] border border-[#262626] rounded-[6px] p-4 space-y-1">
        <h1 className="text-base font-bold text-[#F5F5F5]">Gespeicherte Themen</h1>
        <p className="text-xs text-[#999999]">
          Übersicht deiner persönlichen Lesezeichen.
        </p>
      </div>

      <div className="bg-[#171717] border border-[#262626] rounded-[6px] overflow-hidden text-xs">
        <div className="bg-[#111111] px-4 py-2 border-b border-[#262626] text-[11px] font-semibold text-[#999999] uppercase">
          Lesezeichen ({bookmarks.length})
        </div>

        {bookmarks.length === 0 ? (
          <div className="p-8 text-center text-[#999999]">
            Du hast keine gespeicherten Themen.
          </div>
        ) : (
          <div className="divide-y divide-[#262626]">
            {bookmarks.map(({ thread }) => (
              <div
                key={thread.id}
                className="p-3.5 hover:bg-[#1F1F1F]/40 transition flex items-center justify-between gap-3"
              >
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {thread.prefix && (
                      <span className="px-1.5 py-0.2 rounded-[4px] text-[10px] font-semibold bg-[#111111] text-[#8B5CF6] border border-[#262626]">
                        {thread.prefix.name}
                      </span>
                    )}
                    <Link
                      href={`/forum/thread/${thread.id}`}
                      className="font-medium text-xs text-[#F5F5F5] hover:text-[#8B5CF6] transition truncate"
                    >
                      {thread.title}
                    </Link>
                  </div>
                  <div className="text-[11px] text-[#666666]">
                    In {thread.forum.name} • Von {thread.author.username} • {formatTimeAgo(thread.createdAt)}
                  </div>
                </div>

                <div className="text-right text-[11px] text-[#999999] shrink-0">
                  <span className="text-[#F5F5F5] font-medium">{thread._count.posts}</span> Antworten
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
