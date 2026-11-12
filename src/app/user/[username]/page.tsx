import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import UserProfileClient from '@/components/UserProfileClient';

export const revalidate = 0;

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [currentUser, user] = await Promise.all([
    getCurrentUser(),
    prisma.user.findUnique({
      where: { username },
      include: {
        role: true,
        profilePosts: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: { id: true, username: true, avatarUrl: true, role: true },
            },
          },
        },
      },
    }),
  ]);

  if (!user) {
    notFound();
  }

  const { passwordHash, twoFactorSecret, twoFactorTempSecret, twoFactorRecoveryCodes, email, ...publicProfile } = user;

  // Statistiken parallel berechnen
  const [threadsCount, postsCount, reactionsReceived] = await Promise.all([
    prisma.thread.count({ where: { authorId: user.id } }),
    prisma.post.count({ where: { authorId: user.id } }),
    prisma.reaction.count({
      where: { post: { authorId: user.id } },
    }),
  ]);

  return (
    <UserProfileClient
      profileUser={{ ...publicProfile, email: currentUser?.id === user.id ? email : null }}
      currentUser={currentUser}
      stats={{
        threadsCount,
        postsCount,
        reactionsReceived,
      }}
    />
  );
}
