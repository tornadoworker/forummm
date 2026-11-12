import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatTimeAgo, formatCustomDate } from '@/lib/utils';
import { Newspaper, Sparkles, Megaphone, ChevronRight, MessageSquare } from 'lucide-react';

export const revalidate = 0;

export default async function NewsPage() {
  const newsThreads = await prisma.thread.findMany({
    where: {
      OR: [
        { forum: { name: { in: ['Ankündigungen', 'Changelogs', 'Server Updates', 'Events'] } } },
        { prefix: { name: { in: ['Ankündigung', 'Wichtig'] } } },
      ],
    },
    include: {
      author: { include: { role: true } },
      forum: true,
      prefix: true,
      posts: {
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
      _count: { select: { posts: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-[#101624] border border-[#263247] p-6 sm:p-8 rounded-2xl shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#965CFF]">
          <Newspaper className="w-4 h-4" />
          <span>OFFIZIELLES NEWS PORTAL</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">
          Neuigkeiten & Server Updates
        </h1>
        <p className="text-xs sm:text-sm text-[#94A3B8] max-w-3xl leading-relaxed">
          Verfolge alle Updates, Entwickler-Changelogs, Community-Events und offiziellen Ankündigungen des Vega Crimelife Projekt-Teams.
        </p>
      </div>

      {/* News Artikel Karten */}
      <div className="space-y-6">
        {newsThreads.map((thread) => {
          const firstPost = thread.posts[0];
          return (
            <article
              key={thread.id}
              className="bg-[#151D2D] border border-[#263247] rounded-xl p-6 sm:p-8 shadow-xl space-y-4 hover:border-[#4C8DFF]/40 transition"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {thread.prefix && (
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        color: thread.prefix.color,
                        backgroundColor: thread.prefix.bgColor,
                      }}
                    >
                      {thread.prefix.name}
                    </span>
                  )}
                  <span className="text-xs text-[#94A3B8]">
                    In <span className="text-white font-medium">{thread.forum.name}</span>
                  </span>
                </div>
                <span className="text-xs text-[#64748B]">
                  {formatCustomDate(thread.createdAt)}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white">
                <Link
                  href={`/forum/thread/${thread.id}`}
                  className="hover:text-[#4C8DFF] transition"
                >
                  {thread.title}
                </Link>
              </h2>

              {firstPost && (
                <div className="text-sm text-[#94A3B8] leading-relaxed line-clamp-4 whitespace-pre-line">
                  {firstPost.content}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-[#263247]/60 text-xs">
                <div className="flex items-center gap-2">
                  <img
                    src={
                      thread.author.avatarUrl ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'
                    }
                    alt={thread.author.username}
                    className="w-6 h-6 rounded object-cover border border-[#263247]"
                  />
                  <span
                    className="font-semibold"
                    style={{ color: thread.author.role.color }}
                  >
                    {thread.author.username}
                  </span>
                </div>

                <Link
                  href={`/forum/thread/${thread.id}`}
                  className="text-[#4C8DFF] font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Vollständigen Beitrag lesen & diskutieren ({thread._count.posts})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
