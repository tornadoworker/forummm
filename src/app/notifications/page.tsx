import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatTimeAgo } from '@/lib/utils';
import { Bell, CheckCheck, MessageSquare, LifeBuoy, Mail, Sparkles, ChevronRight } from 'lucide-react';
import NotificationsClient from '@/components/NotificationsClient';

export const revalidate = 0;

export default async function NotificationsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login?callback=/notifications');
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: currentUser.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <NotificationsClient
      currentUser={currentUser}
      initialNotifications={notifications}
    />
  );
}
