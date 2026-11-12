import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatTimeAgo } from '@/lib/utils';
import { Mail, Plus, User, ArrowRight, MessageSquare } from 'lucide-react';
import MessagesClient from '@/components/MessagesClient';

export const revalidate = 0;

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login?callback=/messages');
  }

  const { new: initialRecipient } = await searchParams;

  const participants = await prisma.conversationParticipant.findMany({
    where: { userId: currentUser.id },
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              user: {
                select: { id: true, username: true, avatarUrl: true, role: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: { select: { username: true } },
            },
          },
        },
      },
    },
    orderBy: { conversation: { updatedAt: 'desc' } },
  });

  return (
    <MessagesClient
      currentUser={currentUser}
      initialConversations={participants.map((p) => ({
        ...p.conversation,
        unread: p.conversation.messages[0]
          ? p.conversation.messages[0].createdAt > p.lastReadAt &&
            p.conversation.messages[0].senderId !== currentUser.id
          : false,
      }))}
      initialRecipient={initialRecipient || ''}
    />
  );
}
