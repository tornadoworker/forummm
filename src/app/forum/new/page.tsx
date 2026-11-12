import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import CreateThreadClient from '@/components/CreateThreadClient';

export const revalidate = 0;

export default async function NewThreadPage({
  searchParams,
}: {
  searchParams: Promise<{ forumId?: string }>;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login?redirect=/forum/new');
  }

  // Benutzerberechtigung für Thread-Erstellung prüfen
  if (currentUser.isBanned || !currentUser.role.canCreateThreads) {
    return (
      <div className="max-w-[1000px] mx-auto p-6 bg-[#161616] border border-red-500/40 rounded-[6px] text-xs text-red-400">
        Du hast derzeit keine Berechtigung, neue Themen im Vega Crimelife Forum zu erstellen.
      </div>
    );
  }

  const { forumId } = await searchParams;

  // 1. Kategorien & Foren inkl. Subforen laden
  const categories = await prisma.category.findMany({
    orderBy: { order: 'asc' },
    include: {
      forums: {
        where: { isArchived: false },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        include: {
          parent: true,
        },
      },
    },
  });

  // 2. Aktive Themen-Präfixe laden
  const prefixes = await prisma.threadPrefix.findMany({
    where: { isActive: true },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  });

  return (
    <div className="py-2">
      <CreateThreadClient
        categories={categories}
        prefixes={prefixes}
        currentUser={currentUser}
        initialForumId={forumId}
      />
    </div>
  );
}
