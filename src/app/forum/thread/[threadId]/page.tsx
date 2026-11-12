import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import ThreadViewClient from '@/components/ThreadViewClient';
import { ChevronRight } from 'lucide-react';

export const revalidate = 0;

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const [currentUser, thread] = await Promise.all([
    getCurrentUser(),
    prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        forum: { include: { category: true, parent: true } },
        author: { include: { role: true } },
        prefix: true,
        poll: {
          include: {
            options: true,
          },
        },
        posts: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { include: { role: true } },
            reactions: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    }),
  ]);

  if (!thread) {
    notFound();
  }

  // View-Counter im Hintergrund hochzählen (blockiert nicht das Seiten-Rendering)
  prisma.thread
    .update({
      where: { id: threadId },
      data: { viewsCount: { increment: 1 } },
    })
    .catch(() => {});

  // Prüfen ob vom User gebookmarked + Poll-Vote parallel laden
  let hasBookmarked = false;
  let userPollVoteId: string | null = null;

  if (currentUser) {
    const [bookmark, vote] = await Promise.all([
      prisma.bookmark.findUnique({
        where: {
          userId_threadId: {
            userId: currentUser.id,
            threadId: thread.id,
          },
        },
      }),
      thread.poll
        ? prisma.pollVote.findFirst({
            where: {
              userId: currentUser.id,
              pollOption: { pollId: thread.poll.id },
            },
          })
        : Promise.resolve(null),
    ]);
    hasBookmarked = Boolean(bookmark);
    if (vote) {
      userPollVoteId = vote.pollOptionId;
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-[#94A3B8] flex-wrap">
        <Link href="/forum" className="hover:text-white transition">
          Foren
        </Link>
        {thread.forum.parent && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
            <Link href={`/forum/${thread.forum.parent.id}`} className="hover:text-white transition">
              {thread.forum.parent.name}
            </Link>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
        <Link href={`/forum/${thread.forum.id}`} className="hover:text-white transition">
          {thread.forum.name}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
        <span className="text-white font-medium truncate max-w-xs">{thread.title}</span>
      </div>

      {/* Interaktive Client Komponente */}
      <ThreadViewClient
        thread={thread}
        currentUser={currentUser}
        hasBookmarked={hasBookmarked}
        userPollVoteId={userPollVoteId}
      />
    </div>
  );
}
