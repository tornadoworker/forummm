'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { formatCustomDate } from '@/lib/utils';
import { ArrowLeft, Send, Edit3, Check, X } from 'lucide-react';

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editMsgContent, setEditMsgContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const loadData = () => {
    fetch(`/api/messages/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (data.conversation) {
          setConversation(data.conversation);
          setMessages(data.conversation.messages);
        }
      })
      .catch(() => router.push('/messages'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);

    try {
      const res = await fetch(`/api/messages/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessages([...messages, data.message]);
        setContent('');
      }
    } catch {} finally {
      setSending(false);
    }
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!editMsgContent.trim()) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: msgId, content: editMsgContent.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(
          messages.map((m) =>
            m.id === msgId
              ? { ...m, content: editMsgContent.trim(), updatedAt: new Date().toISOString() }
              : m
          )
        );
        setEditingMsgId(null);
        setEditMsgContent('');
      }
    } catch {} finally {
      setIsSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-[#999999]">
        Unterhaltung wird geladen...
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 max-w-3xl mx-auto">
      <Link
        href="/messages"
        className="inline-flex items-center gap-1.5 text-xs text-[#999999] hover:text-[#F5F5F5] transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Zurück zum Posteingang</span>
      </Link>

      <div className="bg-[#171717] border border-[#262626] rounded-[6px] p-4 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-[#F5F5F5]">{conversation.title}</h1>
          <p className="text-[11px] text-[#666666] mt-0.5">
            Teilnehmer: {conversation.participants.map((p: any) => p.user.username).join(', ')}
          </p>
        </div>
      </div>

      <div className="bg-[#171717] border border-[#262626] rounded-[6px] p-4 space-y-3 max-h-[55vh] overflow-y-auto text-xs">
        {messages.map((msg: any) => (
          <div key={msg.id} className="p-3 bg-[#111111] border border-[#262626] rounded-[6px] space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[#666666] border-b border-[#262626] pb-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#F5F5F5]">{msg.sender.username}</span>
                <span className="text-[10px] text-[#8B5CF6]">{msg.sender.role.displayName}</span>
                {msg.updatedAt && (
                  <span className="text-[10px] text-[#737373] italic">(bearbeitet)</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px]">{formatCustomDate(msg.createdAt)}</span>
                <button
                  onClick={() => {
                    setEditingMsgId(msg.id);
                    setEditMsgContent(msg.content);
                  }}
                  className="text-[#666666] hover:text-white transition p-0.5"
                  title="Nachricht bearbeiten"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {editingMsgId === msg.id ? (
              <div className="space-y-2 pt-1">
                <textarea
                  rows={3}
                  value={editMsgContent}
                  onChange={(e) => setEditMsgContent(e.target.value)}
                  className="w-full bg-[#161616] border border-[#262626] rounded p-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-white leading-relaxed"
                />
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMsgId(null);
                      setEditMsgContent('');
                    }}
                    className="h-6 px-2.5 bg-[#1F1F1F] text-[#A3A3A3] hover:text-white text-[11px] rounded transition"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    disabled={isSavingEdit || !editMsgContent.trim()}
                    onClick={() => handleSaveEdit(msg.id)}
                    className="h-6 px-2.5 bg-white text-black font-semibold text-[11px] rounded transition disabled:opacity-50 flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>{isSavingEdit ? 'Speichert...' : 'Speichern'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#F5F5F5] leading-relaxed whitespace-pre-line">
                {msg.content}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-[#171717] border border-[#262626] rounded-[6px] p-3 text-xs">
        <form onSubmit={handleSend} className="space-y-2.5">
          <textarea
            rows={3}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nachricht schreiben..."
            className="w-full bg-[#111111] border border-[#262626] rounded-[6px] p-2.5 text-xs text-[#F5F5F5] placeholder-[#666666] focus:outline-none focus:border-[#8B5CF6]"
          ></textarea>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={sending}
              className="px-4 py-1.5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-medium rounded-[6px] transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sending ? 'Senden...' : 'Senden'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
