import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const forumId = searchParams.get('forumId') || '';
    const sort = searchParams.get('sort') || 'recent'; // recent | replies | views

    if (!q) {
      return NextResponse.json({
        threads: [],
        posts: [],
        users: [],
        forums: [],
      });
    }

    const threadOrderBy =
      sort === 'replies'
        ? { repliesCount: 'desc' as const }
        : sort === 'views'
        ? { viewsCount: 'desc' as const }
        : { lastActivityAt: 'desc' as const };

    const [threads, posts, users, forums] = await Promise.all([
      prisma.thread.findMany({
        where: {
          isDeleted: false,
          ...(forumId ? { forumId } : {}),
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { author: { username: { contains: q, mode: 'insensitive' } } },
            { prefix: { name: { contains: q, mode: 'insensitive' } } },
            { posts: { some: { isDeleted: false, content: { contains: q, mode: 'insensitive' } } } },
          ],
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              role: { select: { displayName: true, color: true } },
            },
          },
          forum: { select: { id: true, name: true } },
          prefix: true,
          _count: { select: { posts: true } },
        },
        orderBy: threadOrderBy,
        take: 25,
      }),

      prisma.post.findMany({
        where: {
          isDeleted: false,
          thread: {
            isDeleted: false,
            ...(forumId ? { forumId } : {}),
          },
          content: { contains: q, mode: 'insensitive' },
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              role: { select: { displayName: true, color: true } },
            },
          },
          thread: {
            select: {
              id: true,
              title: true,
              forum: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { displayName: { contains: q, mode: 'insensitive' } },
            { bio: { contains: q, mode: 'insensitive' } },
            { discordTag: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          role: { select: { displayName: true, color: true } },
          _count: { select: { threads: true, posts: true } },
        },
        take: 12,
      }),

      prisma.forum.findMany({
        where: {
          isArchived: false,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          _count: { select: { threads: true } },
        },
        take: 8,
      }),
    ]);

    return NextResponse.json({
      threads,
      posts,
      users,
      forums,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
