'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatTimeAgo } from '@/lib/utils';
import { Mail, Plus, User, Send, AlertCircle } from 'lucide-react';

interface MessagesClientProps {
  currentUser: any;
  initialConversations: any[];
  initialRecipient?: string;
}

export default function MessagesClient({
  currentUser,
  initialConversations,
  initialRecipient = '',
}: MessagesClientProps) {
  const router = useRouter();
  const [conversations, setConversations] = useState(initialConversations);
  const [showNewModal, setShowNewModal] = useState(Boolean(initialRecipient));
  const [recipient, setRecipient] = useState(initialRecipient);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !content.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientUsername: recipient,
          title: title || undefined,
          content,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Fehler beim Erstellen der Unterhaltung.');
      } else {
        router.push(`/messages/${data.conversationId}`);
      }
    } catch {
      setError('Verbindung zum Server fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-[#171717] border border-[#262626] rounded-[6px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-[#F5F5F5]">Private Nachrichten</h1>
          <p className="text-xs text-[#999999]">
            Direkte Unterhaltungen mit anderen Mitgliedern.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="self-start sm:self-auto px-3 py-1.5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-medium rounded-[6px] transition flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Neue Unterhaltung</span>
        </button>
      </div>

      {/* Neue Nachricht Formular */}
      {showNewModal && (
        <div className="bg-[#171717] border border-[#262626] rounded-[6px] p-4 space-y-3 max-w-xl mx-auto text-xs">
          <div className="flex items-center justify-between border-b border-[#262626] pb-2">
            <h2 className="font-bold text-[#F5F5F5] uppercase">
              Neue Unterhaltung starten
            </h2>
            <button
              onClick={() => setShowNewModal(false)}
              className="text-xs text-[#999999] hover:text-[#F5F5F5]"
            >
              Schließen
            </button>
          </div>

          {error && (
            <div className="p-2.5 bg-[#111111] border border-red-500/40 rounded text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateConversation} className="space-y-3">
            <div>
              <label className="block text-[#999999] mb-1">Empfänger (Benutzername)</label>
              <input
                type="text"
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Benutzername..."
                className="w-full bg-[#111111] border border-[#262626] rounded-[4px] px-3 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <div>
              <label className="block text-[#999999] mb-1">Betreff</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Betreff..."
                className="w-full bg-[#111111] border border-[#262626] rounded-[4px] px-3 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <div>
              <label className="block text-[#999999] mb-1">Nachricht</label>
              <textarea
                rows={4}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nachricht schreiben..."
                className="w-full bg-[#111111] border border-[#262626] rounded-[4px] p-2.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-[#262626]">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-3 py-1 text-[#999999] hover:text-[#F5F5F5]"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-3 py-1 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white font-medium rounded-[4px] transition flex items-center gap-1 disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                <span>{loading ? 'Wird gestartet...' : 'Senden'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste */}
      <div className="bg-[#171717] border border-[#262626] rounded-[6px] overflow-hidden text-xs">
        <div className="bg-[#111111] px-4 py-2 border-b border-[#262626] text-[11px] font-semibold text-[#999999] uppercase">
          Unterhaltungen ({conversations.length})
        </div>

        {conversations.length === 0 ? (
          <div className="p-8 text-center text-[#999999]">
            Keine Unterhaltungen vorhanden.
          </div>
        ) : (
          <div className="divide-y divide-[#262626]">
            {conversations.map((c) => {
              const otherParticipants = c.participants
                .filter((p: any) => p.user.id !== currentUser.id)
                .map((p: any) => p.user);
              const lastMsg = c.messages[0];

              return (
                <Link
                  key={c.id}
                  href={`/messages/${c.id}`}
                  className={`p-3.5 hover:bg-[#1F1F1F]/40 transition flex items-center justify-between gap-3 block group ${
                    c.unread ? 'bg-[#1F1F1F]/40' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-[4px] bg-[#111111] border border-[#262626] flex items-center justify-center text-[#8B5CF6] shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#F5F5F5] group-hover:text-[#8B5CF6] transition truncate">
                          {c.title || 'Unterhaltung'}
                        </span>
                        {c.unread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]"></span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#999999] truncate">
                        Teilnehmer:{' '}
                        {otherParticipants.map((u: any) => u.username).join(', ') || 'Nur du'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[10px] text-[#666666] shrink-0">
                    {formatTimeAgo(c.updatedAt)}
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
