'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatTimeAgo } from '@/lib/utils';
import { Bell, CheckCheck, MessageSquare, LifeBuoy, Mail, ThumbsUp } from 'lucide-react';

interface NotificationsClientProps {
  currentUser: any;
  initialNotifications: any[];
}

export default function NotificationsClient({
  currentUser,
  initialNotifications,
}: NotificationsClientProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'POST', body: JSON.stringify({}) });
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      router.refresh();
    } catch {}
  };

  const markSingleAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      router.refresh();
    } catch {}
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'REPLY':
        return <MessageSquare className="w-3.5 h-3.5 text-[#8B5CF6]" />;
      case 'TICKET_UPDATE':
        return <LifeBuoy className="w-3.5 h-3.5 text-[#F5F5F5]" />;
      case 'DM':
        return <Mail className="w-3.5 h-3.5 text-[#8B5CF6]" />;
      case 'REACTION':
        return <ThumbsUp className="w-3.5 h-3.5 text-[#8B5CF6]" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-[#8B5CF6]" />;
    }
  };

  return (
    <div className="w-full space-y-4 max-w-3xl mx-auto">
      <div className="bg-[#171717] border border-[#262626] rounded-[6px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-[#F5F5F5]">Benachrichtigungen</h1>
          <p className="text-xs text-[#999999]">
            Antworten auf deine Themen, Erwähnungen und Ticket-Updates.
          </p>
        </div>

        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={markAllAsRead}
            className="self-start sm:self-auto px-3 py-1.5 bg-[#111111] hover:bg-[#1F1F1F] text-[#F5F5F5] border border-[#262626] text-xs font-medium rounded-[6px] transition flex items-center gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>Alle als gelesen markieren</span>
          </button>
        )}
      </div>

      <div className="bg-[#171717] border border-[#262626] rounded-[6px] overflow-hidden text-xs">
        <div className="bg-[#111111] px-4 py-2 border-b border-[#262626] text-[11px] font-semibold text-[#999999] uppercase">
          Mitteilungen ({notifications.length})
        </div>

        {notifications.length === 0 ? (
          <div className="p-8 text-center text-[#999999]">
            Keine Benachrichtigungen vorhanden.
          </div>
        ) : (
          <div className="divide-y divide-[#262626]">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 transition flex items-center justify-between gap-3 ${
                  !n.isRead ? 'bg-[#1F1F1F]/40' : 'hover:bg-[#1F1F1F]/20'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-[4px] bg-[#111111] border border-[#262626] flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(n.type)}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[#F5F5F5] truncate">{n.title}</span>
                      {!n.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]"></span>
                      )}
                    </div>
                    <p className="text-[#999999] leading-relaxed text-[11px]">{n.message}</p>
                    <span className="text-[10px] text-[#666666] block">
                      {formatTimeAgo(n.createdAt)}
                    </span>
                  </div>
                </div>

                {n.link && (
                  <Link
                    href={n.link}
                    onClick={() => markSingleAsRead(n.id)}
                    className="px-2.5 py-1 bg-[#111111] hover:bg-[#1F1F1F] border border-[#262626] text-[#F5F5F5] text-xs rounded-[4px] shrink-0"
                  >
                    Öffnen
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
