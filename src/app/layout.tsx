import type { Metadata } from 'next';
import './globals.css';
import SiteShell from '@/components/SiteShell';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Vega Crimelife – Offizielles Community Forum | GTA V FiveM',
  description:
    'Das offizielle Community Forum von Vega Crimelife. Diskutiere über FiveM Roleplay, reiche Support Tickets ein, lies das Regelwerk und verbinde dich mit Spielern.',
  icons: {
    icon: '/logo.png',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  let unreadNotificationsCount = 0;
  let unreadMessagesCount = 0;

  if (user) {
    const [notifCount, participantEntries] = await Promise.all([
      prisma.notification.count({
        where: {
          userId: user.id,
          isRead: false,
        },
      }),
      prisma.conversationParticipant.findMany({
        where: { userId: user.id },
        select: {
          lastReadAt: true,
          conversation: {
            select: {
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { senderId: true, createdAt: true },
              },
            },
          },
        },
      }),
    ]);

    unreadNotificationsCount = notifCount;

    for (const p of participantEntries) {
      const lastMessage = p.conversation.messages[0];
      if (lastMessage && lastMessage.senderId !== user.id && lastMessage.createdAt > p.lastReadAt) {
        unreadMessagesCount++;
      }
    }
  }

  return (
    <html lang="de" className="dark">
      <body className="bg-[#090909] text-[#F5F5F5] min-h-screen flex flex-col antialiased selection:bg-[#8B5CF6]/30 selection:text-[#F5F5F5]">
        <SiteShell
          currentUser={
            user
              ? {
                  id: user.id,
                  username: user.username,
                  email: user.email,
                  avatarUrl: user.avatarUrl,
                  role: {
                    name: user.role.name,
                    displayName: user.role.displayName,
                    color: user.role.color,
                    canAccessAdmin: user.role.canAccessAdmin,
                  },
                }
              : null
          }
          unreadNotificationsCount={unreadNotificationsCount}
          unreadMessagesCount={unreadMessagesCount}
        >
          {children}
        </SiteShell>
      </body>
    </html>
  );
}
