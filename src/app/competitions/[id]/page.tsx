import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import CompetitionDetailClient from '@/components/CompetitionDetailClient';

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const competition = await prisma.competition.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { title: true, description: true },
  });

  if (!competition) {
    return { title: 'Wettbewerb nicht gefunden | VEGA CrimeLife' };
  }

  return {
    title: `${competition.title} | VEGA CrimeLife`,
    description: competition.description,
  };
}

export default async function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [currentUser, competition] = await Promise.all([
    getCurrentUser(),
    prisma.competition.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            role: { select: { displayName: true, color: true } },
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                role: { select: { displayName: true, color: true } },
              },
            },
          },
          orderBy: [{ points: 'desc' }, { wins: 'desc' }],
        },
        matches: {
          include: {
            challenger: { select: { id: true, username: true, avatarUrl: true } },
            challenged: { select: { id: true, username: true, avatarUrl: true } },
            winner: { select: { id: true, username: true } },
          },
          orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
        },
      },
    }),
  ]);

  if (!competition) {
    notFound();
  }

  return (
    <CompetitionDetailClient
      competition={competition as any}
      currentUser={
        currentUser
          ? {
              id: currentUser.id,
              username: currentUser.username,
              role: {
                canAccessAdmin: currentUser.role.canAccessAdmin,
                displayName: currentUser.role.displayName,
              },
            }
          : null
      }
    />
  );
}
