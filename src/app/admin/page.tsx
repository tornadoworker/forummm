import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/permissions';
import AdminClient from '@/components/AdminClient';

export const revalidate = 0;

export default async function AdminPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login?redirect=/admin');
  }

  if (!canAccessAdmin(currentUser)) {
    redirect('/');
  }

  const [
    usersCount,
    activeUsersCount,
    threadsCount,
    postsCount,
    openTicketsCount,
    bannedUsersCount,
    openReportsCount,
    flaggedPostsCount,
    flaggedUsersCount,
    activeBansCount,
    activeMutesCount,
    activeWarningsCount,
    users,
    roles,
    categories,
    prefixes,
    tickets,
    auditLogs,
    reports,
    warnings,
    banRecords,
    moderatedThreads,
    moderatedPosts,
    competitions,
    competitionMatches,
    integrationConfigs,
    integrationLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isBanned: false } }),
    prisma.thread.count(),
    prisma.post.count(),
    prisma.ticket.count({ where: { status: { not: 'CLOSED' } } }),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.report.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.report.count({ where: { type: 'POST' } }),
    prisma.report.count({ where: { type: 'USER' } }),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.user.count({ where: { isMuted: true } }),
    prisma.warning.count({ where: { isRevoked: false } }),
    prisma.user.findMany({
      include: {
        role: true,
        _count: {
          select: { threads: true, posts: true, ticketsCreated: true, reportsCreated: true, warningsReceived: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.role.findMany({
      include: {
        _count: { select: { users: true } },
      },
      orderBy: { priority: 'desc' },
    }),
    prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: {
        forums: {
          orderBy: { order: 'asc' },
          include: {
            _count: { select: { threads: true } },
          },
        },
      },
    }),
    prisma.threadPrefix.findMany({
      include: {
        _count: { select: { threads: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.ticket.findMany({
      include: {
        category: true,
        author: { select: { username: true, avatarUrl: true } },
        assignedTo: { select: { username: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { username: true, email: true, avatarUrl: true, role: true },
        },
      },
      take: 100,
    }),
    prisma.report.findMany({
      include: {
        reporter: { select: { id: true, username: true, avatarUrl: true, role: true } },
        assignedTo: { select: { id: true, username: true, role: true } },
        thread: { select: { id: true, title: true, author: { select: { username: true } } } },
        post: { select: { id: true, content: true, author: { select: { username: true } }, threadId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.warning.findMany({
      include: {
        user: { select: { id: true, username: true, avatarUrl: true, role: true, warningPoints: true } },
        issuer: { select: { id: true, username: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.banRecord.findMany({
      include: {
        user: { select: { id: true, username: true, avatarUrl: true, role: true, isBanned: true, isMuted: true } },
        issuer: { select: { id: true, username: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.thread.findMany({
      include: {
        forum: true,
        author: { include: { role: true } },
        prefix: true,
        _count: { select: { posts: true, reports: true } },
      },
      orderBy: { lastActivityAt: 'desc' },
      take: 100,
    }),
    prisma.post.findMany({
      include: {
        author: { include: { role: true } },
        thread: true,
        _count: { select: { reports: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.competition.findMany({
      include: {
        creator: { select: { username: true } },
        _count: { select: { participants: true, matches: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.competitionMatch.findMany({
      include: {
        challenger: { select: { id: true, username: true } },
        challenged: { select: { id: true, username: true } },
        winner: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.integrationConfig.findMany({ orderBy: { name: 'asc' } }),
    prisma.integrationLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);

  // 9. Systeminfos
  const systemInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    environment: process.env.NODE_ENV || 'development',
    serverAddress: process.env.FIVEM_SERVER_IP || 'play.vega-crimelife.de',
  };

  return (
    <AdminClient
      currentUser={currentUser}
      stats={{
        usersCount,
        activeUsersCount,
        threadsCount,
        postsCount,
        openTicketsCount,
        bannedUsersCount,
        openReportsCount,
        flaggedPostsCount,
        flaggedUsersCount,
        activeBansCount,
        activeMutesCount,
        activeWarningsCount,
      }}
      users={users}
      roles={roles}
      categories={categories}
      prefixes={prefixes}
      tickets={tickets}
      auditLogs={auditLogs}
      systemInfo={systemInfo}
      reports={reports}
      warnings={warnings}
      banRecords={banRecords}
      moderatedThreads={moderatedThreads}
      moderatedPosts={moderatedPosts}
      competitions={competitions}
      competitionMatches={competitionMatches}
      integrationConfigs={integrationConfigs}
      integrationLogs={integrationLogs}
    />
  );
}
