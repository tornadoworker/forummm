'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatTimeAgo, formatCustomDate } from '@/lib/utils';
import {
  ArrowLeft,
  Send,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  EyeOff
} from 'lucide-react';

interface TicketDetailProps {
  initialTicket: any;
  currentUser: any;
  isStaff: boolean;
  canSeeNotes: boolean;
  availableStaff: any[];
}

export default function TicketDetailClient({
  initialTicket,
  currentUser,
  isStaff,
  canSeeNotes,
  availableStaff,
}: TicketDetailProps) {
  const router = useRouter();
  const [ticket, setTicket] = useState(initialTicket);
  const [messages, setMessages] = useState<any[]>(initialTicket.messages);
  const [replyContent, setReplyContent] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status ändern (Offen, In Bearbeitung, Geschlossen)
  const handleUpdateStatus = async (status: string) => {
    try {
      const res = await fetch(`/api/support/tickets/${ticket.ticketNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setTicket({ ...ticket, status });
        router.refresh();
      }
    } catch {}
  };

  // Ticket zuweisen / übernehmen
  const handleAssign = async (assignedToId: string) => {
    try {
      const res = await fetch(`/api/support/tickets/${ticket.ticketNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId }),
      });
      if (res.ok) {
        const found = availableStaff.find((s) => s.id === assignedToId);
        setTicket({ ...ticket, assignedTo: found || null });
        router.refresh();
      }
    } catch {}
  };

  // Antwort senden
  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    setSubmittingReply(true);
    setError(null);

    try {
      const res = await fetch(`/api/support/tickets/${ticket.ticketNumber}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyContent,
          isInternalNote: Boolean(isInternalNote && canSeeNotes),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Fehler beim Senden.');
      } else {
        setMessages([...messages, data.message]);
        setReplyContent('');
        setIsInternalNote(false);
        router.refresh();
      }
    } catch {
      setError('Verbindung zum Server fehlgeschlagen.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'CLOSED') {
      return <span className="text-[#666666] font-medium">Geschlossen</span>;
    }
    if (status === 'IN_PROGRESS') {
      return <span className="text-[#F5F5F5] font-medium">In Bearbeitung</span>;
    }
    return <span className="text-[#8B5CF6] font-medium">Offen</span>;
  };

  return (
    <div className="space-y-4">
      {/* Zurück */}
      <Link
        href="/support"
        className="inline-flex items-center gap-1.5 text-xs text-[#999999] hover:text-[#F5F5F5] transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Zurück zu den Tickets</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Hauptbereich: Details & Verlauf */}
        <div className="lg:col-span-3 space-y-4">
          {/* Kopfzeile */}
          <div className="bg-[#171717] border border-[#262626] rounded-[6px] p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[#8B5CF6] font-medium">
                  {ticket.ticketNumber}
                </span>
                <span className="text-[#666666]">•</span>
                <span className="text-[#999999]">{ticket.category.name}</span>
                <span className="text-[#666666]">•</span>
                {getStatusBadge(ticket.status)}
              </div>
              <span className="text-[11px] text-[#666666]">
                {formatCustomDate(ticket.createdAt)}
              </span>
            </div>

            <h1 className="text-base font-bold text-[#F5F5F5]">{ticket.title}</h1>

            {ticket.evidenceUrl && (
              <div className="text-xs pt-1 border-t border-[#262626]">
                <span className="text-[#666666] mr-1.5">Beweismaterial:</span>
                <a
                  href={ticket.evidenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#8B5CF6] hover:underline"
                >
                  {ticket.evidenceUrl}
                </a>
              </div>
            )}
          </div>

          {/* Nachrichtenverlauf */}
          <div className="space-y-3">
            {messages.map((msg: any) => {
              const isInternal = msg.isInternalNote;

              return (
                <div
                  key={msg.id}
                  className={`bg-[#171717] border rounded-[6px] p-4 space-y-2 text-xs ${
                    isInternal ? 'border-[#8B5CF6]/50 bg-[#171717]/90' : 'border-[#262626]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-[#666666] border-b border-[#262626] pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#F5F5F5]">
                        {msg.author.username}
                      </span>
                      <span className="text-[10px] text-[#8B5CF6]">
                        {msg.author.role.displayName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isInternal && (
                        <span className="text-[10px] text-[#8B5CF6] font-medium">
                          Interne Notiz
                        </span>
                      )}
                      <span>{formatCustomDate(msg.createdAt)}</span>
                    </div>
                  </div>

                  <div className="text-xs text-[#F5F5F5] leading-relaxed whitespace-pre-line">
                    {msg.content}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Antwortfeld */}
          {ticket.status !== 'CLOSED' ? (
            <div className="bg-[#171717] border border-[#262626] rounded-[6px] p-4 space-y-3">
              <h3 className="text-xs font-bold text-[#F5F5F5] uppercase">
                {isInternalNote ? 'Interne Teamnotiz verfassen' : 'Antwort verfassen'}
              </h3>

              {error && (
                <div className="p-2.5 bg-[#111111] border border-red-500/40 text-red-400 text-xs rounded-[6px]">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmitMessage} className="space-y-3">
                <textarea
                  rows={4}
                  required
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={
                    isInternalNote
                      ? 'Interne Notiz (nur für Teammitglieder sichtbar)...'
                      : 'Nachricht eingeben...'
                  }
                  className="w-full bg-[#111111] border border-[#262626] rounded-[6px] p-3 text-xs text-[#F5F5F5] placeholder-[#666666] focus:outline-none focus:border-[#8B5CF6]"
                ></textarea>

                <div className="flex items-center justify-between">
                  {canSeeNotes ? (
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[#8B5CF6]">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="accent-[#8B5CF6]"
                      />
                      <span>Als interne Teamnotiz speichern</span>
                    </label>
                  ) : (
                    <div></div>
                  )}

                  <button
                    type="submit"
                    disabled={submittingReply}
                    className="px-4 py-1.5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-medium rounded-[6px] transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingReply ? 'Wird gesendet...' : 'Antworten'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-[#171717] border border-[#262626] rounded-[6px] p-3 text-center text-xs text-[#999999] flex items-center justify-center gap-2">
              <Lock className="w-3.5 h-3.5 text-[#666666]" />
              <span>Dieses Ticket ist geschlossen.</span>
              {isStaff && (
                <button
                  onClick={() => handleUpdateStatus('OPEN')}
                  className="text-xs text-[#8B5CF6] hover:underline ml-2"
                >
                  Wieder öffnen
                </button>
              )}
            </div>
          )}
        </div>

        {/* Rechte Spalte: Ticket Aktionen */}
        <div className="space-y-4">
          <div className="bg-[#171717] border border-[#262626] rounded-[6px] p-4 space-y-3 text-xs">
            <h3 className="text-xs font-bold text-[#F5F5F5] uppercase border-b border-[#262626] pb-2">
              Ticket Details
            </h3>

            <div>
              <span className="text-[#666666] block text-[10px]">Status</span>
              {isStaff ? (
                <select
                  value={ticket.status === 'CLOSED' ? 'CLOSED' : ticket.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'OPEN'}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  className="w-full mt-1 bg-[#111111] border border-[#262626] rounded-[6px] px-2.5 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="OPEN">Offen</option>
                  <option value="IN_PROGRESS">In Bearbeitung</option>
                  <option value="CLOSED">Geschlossen</option>
                </select>
              ) : (
                <div className="mt-1 text-[#F5F5F5]">{getStatusBadge(ticket.status)}</div>
              )}
            </div>

            {isStaff && (
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[#666666] text-[10px]">Bearbeiter</span>
                  {ticket.assignedTo?.id !== currentUser.id && (
                    <button
                      onClick={() => handleAssign(currentUser.id)}
                      className="text-[10px] text-[#8B5CF6] hover:underline"
                    >
                      Übernehmen
                    </button>
                  )}
                </div>
                <select
                  value={ticket.assignedTo?.id || ''}
                  onChange={(e) => handleAssign(e.target.value)}
                  className="w-full mt-1 bg-[#111111] border border-[#262626] rounded-[6px] px-2.5 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="">Niemand</option>
                  {availableStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.username}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Schließen Button für User */}
            {ticket.status !== 'CLOSED' && (
              <button
                onClick={() => handleUpdateStatus('CLOSED')}
                className="w-full mt-2 py-1.5 bg-[#111111] hover:bg-[#1F1F1F] text-[#999999] hover:text-[#F5F5F5] border border-[#262626] rounded-[6px] text-xs transition"
              >
                Ticket schließen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
