import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canManageTickets } from '@/lib/permissions';
import { formatTimeAgo, formatCustomDate } from '@/lib/utils';
import { LifeBuoy, Plus, CheckCircle2, ArrowRight } from 'lucide-react';

export const revalidate = 0;

export default async function SupportOverviewPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="bg-[#171717] border border-[#262626] rounded-[6px] p-6 max-w-sm text-center space-y-3">
          <LifeBuoy className="w-8 h-8 text-[#8B5CF6] mx-auto" />
          <h1 className="text-sm font-bold text-[#F5F5F5] uppercase">Support Bereich</h1>
          <p className="text-xs text-[#999999]">
            Bitte melde dich an, um Support-Tickets zu erstellen oder einzusehen.
          </p>
          <div className="flex justify-center gap-2 pt-1">
            <Link
              href="/login"
              className="px-4 py-1.5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-medium rounded-[6px]"
            >
              Anmelden
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isStaff = canManageTickets(currentUser);

  // Tickets laden: Staff sieht alle, normale User ausschließlich eigene Tickets
  const tickets = await prisma.ticket.findMany({
    where: isStaff ? {} : { authorId: currentUser.id },
    include: {
      category: true,
      author: { include: { role: true } },
      assignedTo: { include: { role: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const getStatusText = (status: string) => {
    switch (status) {
      case 'OPEN':
      case 'WAITING_FOR_USER':
      case 'WAITING_FOR_STAFF':
        return { label: 'Offen', color: 'text-[#8B5CF6] border-[#8B5CF6]/30' };
      case 'IN_PROGRESS':
        return { label: 'In Bearbeitung', color: 'text-[#F5F5F5] border-[#262626]' };
      case 'CLOSED':
        return { label: 'Geschlossen', color: 'text-[#666666] border-[#262626]' };
      default:
        return { label: 'Offen', color: 'text-[#8B5CF6] border-[#8B5CF6]/30' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#171717] border border-[#262626] rounded-[6px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-[#F5F5F5]">Support Tickets</h1>
          <p className="text-xs text-[#999999]">
            {isStaff
              ? 'Team-Übersicht aller Support-Anfragen.'
              : 'Übersicht deiner persönlichen Support-Tickets.'}
          </p>
        </div>

        <Link
          href="/support/new"
          className="self-start sm:self-auto px-3 py-1.5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-medium rounded-[6px] transition inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Ticket erstellen</span>
        </Link>
      </div>

      {/* Ticket Liste */}
      <div className="bg-[#171717] border border-[#262626] rounded-[6px] overflow-hidden">
        <div className="bg-[#111111] px-4 py-2 border-b border-[#262626] flex items-center justify-between text-[11px] font-semibold text-[#999999] uppercase">
          <span>Tickets ({tickets.length})</span>
          {isStaff && <span className="text-[#8B5CF6] font-normal">Team-Ansicht</span>}
        </div>

        {tickets.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#999999]">
            Keine Tickets vorhanden.
          </div>
        ) : (
          <div className="divide-y divide-[#262626]">
            {tickets.map((t) => {
              const statusInfo = getStatusText(t.status);
              return (
                <Link
                  key={t.id}
                  href={`/support/ticket/${t.ticketNumber}`}
                  className="p-3.5 hover:bg-[#1F1F1F]/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs block group"
                >
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[#8B5CF6]">
                        {t.ticketNumber}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded-[4px] text-[10px] border bg-[#111111] ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <span className="text-[11px] text-[#666666]">
                        {t.category.name}
                      </span>
                    </div>

                    <div className="font-semibold text-sm text-[#F5F5F5] group-hover:text-[#8B5CF6] transition truncate">
                      {t.title}
                    </div>

                    <div className="text-[11px] text-[#666666]">
                      Erstellt von {t.author.username} • {formatTimeAgo(t.createdAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-[11px] text-[#999999] shrink-0">
                    <div>
                      <span className="text-[#666666] block text-[10px]">Bearbeiter</span>
                      <span className="text-[#F5F5F5]">
                        {t.assignedTo ? t.assignedTo.username : 'Niemand'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#666666] block text-[10px]">Nachrichten</span>
                      <span className="text-[#8B5CF6] font-medium">{t._count.messages}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
