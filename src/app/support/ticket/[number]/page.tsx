import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canManageTickets, canViewInternalNotes } from '@/lib/permissions';
import TicketDetailClient from '@/components/TicketDetailClient';

export const revalidate = 0;

export default async function TicketPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/login?callback=/support/ticket/${number}`);
  }

  const isStaff = canManageTickets(currentUser);
  const canSeeNotes = canViewInternalNotes(currentUser);

  const ticket = await prisma.ticket.findUnique({
    where: { ticketNumber: number },
    include: {
      category: true,
      author: {
        include: { role: true },
      },
      assignedTo: {
        include: { role: true },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        where: canSeeNotes ? {} : { isInternalNote: false }, // Sicherheitsfilter
        include: {
          author: { include: { role: true } },
        },
      },
      auditLogs: {
        orderBy: { createdAt: 'desc' },
        include: {
          user: { include: { role: true } },
        },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  // Berechtigungsprüfung: Nur Autor oder Support-Staff
  if (!isStaff && ticket.authorId !== currentUser.id) {
    notFound();
  }

  // Verfügbares Team laden für Zuweisungs-Dropdown
  let availableStaff: any[] = [];
  if (isStaff) {
    availableStaff = await prisma.user.findMany({
      where: { role: { canManageTickets: true } },
      include: { role: true },
      orderBy: { username: 'asc' },
    });
  }

  return (
    <TicketDetailClient
      initialTicket={ticket}
      currentUser={currentUser}
      isStaff={isStaff}
      canSeeNotes={canSeeNotes}
      availableStaff={availableStaff}
    />
  );
}
