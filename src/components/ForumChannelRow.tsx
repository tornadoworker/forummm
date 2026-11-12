'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  ChevronDown,
  Crosshair,
  Swords,
  Shield,
  ShieldAlert,
  FileText,
  Calendar,
  Sparkles
} from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';

export const SUBFORUMS_MAP: Record<string, string[]> = {
  'Beschwerden': ['Spielerbeschwerden', 'Adminbeschwerden', 'Fraktionsbeschwerden'],
  'Bewerbungen': ['Leader-Bewerbungen', 'Team-Bewerbungen', 'Fraktions-Bewerbungen'],
  'Live Statistik': ['Spieler-Ranglisten', 'Fraktions-Statistiken', 'Bester Shooter'],
  'Wettbewerbe': ['1v1 Duelle & Herausforderungen', 'Team- & Fraktions-Turniere', 'Match-Ergebnisse & Archiv'],
  'Private Organisationen': ['Inoffizielle Organisationen / Familien', 'Unternehmen & Betriebe'],
  'Globale Ereignisse': ['Server-Events', 'Community-Treffen & Tuning-Treffs'],
};

interface ForumChannelProps {
  forum: {
    id: string;
    name: string;
    description: string | null;
    threadsCount: number;
    postsCount: number;
    icon?: string | null;
    subforums?: Array<{
      id: string;
      name: string;
      description?: string | null;
    }>;
    threads: Array<{
      id: string;
      title: string;
      createdAt: Date | string;
      lastActivityAt: Date | string;
      prefix?: {
        name: string;
        color: string;
        bgColor: string;
      } | null;
      author: {
        username: string;
        avatarUrl: string | null;
        role?: {
          color?: string;
          displayName?: string;
        } | null;
      };
      posts: Array<{
        author: {
          username: string;
          avatarUrl: string | null;
        };
        createdAt: Date | string;
      }>;
    }>;
    _count?: {
      threads: number;
    };
  };
}

export default function ForumChannelRow({ forum }: ForumChannelProps) {
  const [subforumsOpen, setSubforumsOpen] = useState(false);
  // Reale Datenbank-Subforen bevorzugen
  const dbSubforums = forum.subforums && forum.subforums.length > 0 ? forum.subforums : null;
  const legacySubforumNames = SUBFORUMS_MAP[forum.name] || [];
  const hasSubforums = (dbSubforums && dbSubforums.length > 0) || legacySubforumNames.length > 0;
  const latestThread = forum.threads?.[0];
  const threadsCount = forum._count?.threads ?? forum.threadsCount ?? 0;
  const postsCount = forum.postsCount ?? 0;

  // Format large numbers (e.g. 7.5K)
  const formatCount = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getForumIcon = (name: string) => {
    switch (name) {
      case 'Live Statistik':
        return <Crosshair className="w-4 h-4 text-[#F5F5F5]" />;
      case 'Wettbewerbe':
        return <Swords className="w-4 h-4 text-[#F5F5F5]" />;
      case 'Server-Regeln':
        return <Shield className="w-4 h-4 text-[#F5F5F5]" />;
      case 'Beschwerden':
        return <ShieldAlert className="w-4 h-4 text-[#F5F5F5]" />;
      case 'Bewerbungen':
        return <FileText className="w-4 h-4 text-[#F5F5F5]" />;
      case 'Globale Ereignisse':
        return <Calendar className="w-4 h-4 text-[#F5F5F5]" />;
      default:
        return <MessageSquare className="w-4 h-4 text-[#F5F5F5]" />;
    }
  };

  const forumHref =
    forum.name === 'Live Statistik'
      ? '/stats'
      : forum.name === 'Wettbewerbe'
      ? '/competitions'
      : `/forum/${forum.id}`;

  return (
    <div className="p-4 hover:bg-[#181818] transition flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
      {/* 1. Links: Icon + Titel + NEW/LIVE Badge + Subforums */}
      <div className="flex items-start gap-3.5 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-[6px] bg-[#111111] border border-[#292929] flex items-center justify-center text-[#F5F5F5] shrink-0 mt-0.5">
          {getForumIcon(forum.name)}
        </div>

        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={forumHref}
              className="font-bold text-[15px] text-[#F5F5F5] hover:text-white transition"
            >
              {forum.name}
            </Link>

            {forum.name === 'Live Statistik' ? (
              <span className="px-1.5 py-0.5 bg-[#1F1F1F] border border-[#333333] text-[#F5F5F5] text-[9px] font-semibold rounded-[3px] tracking-wider uppercase inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFFFFF] animate-pulse"></span>
                LIVE
              </span>
            ) : forum.name === 'Wettbewerbe' ? (
              <span className="px-1.5 py-0.5 bg-[#1F1F1F] border border-[#333333] text-[#F5F5F5] text-[9px] font-semibold rounded-[3px] tracking-wider uppercase">
                DUELLE
              </span>
            ) : (
              <span className="px-1.5 py-0.5 bg-[#1F1F1F] border border-[#333333] text-[#F5F5F5] text-[9px] font-semibold rounded-[3px] tracking-wider uppercase">
                NEW
              </span>
            )}
          </div>

          {forum.description && (
            <p className="text-[11px] text-[#A3A3A3] line-clamp-1">{forum.description}</p>
          )}

          {/* Sub-forums Dropdown / Links */}
          {hasSubforums && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setSubforumsOpen(!subforumsOpen)}
                className="text-[11px] text-[#A3A3A3] hover:text-[#F5F5F5] flex items-center gap-1 transition cursor-pointer"
              >
                <span>Unterbereiche ({dbSubforums ? dbSubforums.length : legacySubforumNames.length})</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {subforumsOpen && (
                <div className="absolute left-0 top-6 z-30 bg-[#161616] border border-[#292929] rounded-[6px] shadow-2xl p-2 min-w-[240px] space-y-1 text-xs">
                  <span className="text-[10px] text-[#737373] uppercase font-semibold px-2 py-0.5 block">
                    Unterbereiche in {forum.name}
                  </span>
                  {dbSubforums ? (
                    dbSubforums.map((sub) => {
                      let subHref = `/forum/${sub.id}`;
                      if (forum.name === 'Live Statistik') {
                        if (sub.name.includes('Fraktion')) subHref = '/stats?mode=factions';
                        else subHref = '/stats';
                      } else if (forum.name === 'Wettbewerbe') {
                        if (sub.name.includes('Team')) subHref = '/competitions?type=TEAM';
                        else if (sub.name.includes('Ergebnisse')) subHref = '/competitions?status=COMPLETED';
                        else subHref = '/competitions?type=1V1';
                      }

                      return (
                        <Link
                          key={sub.id}
                          href={subHref}
                          className="block px-2.5 py-1.5 rounded-[4px] text-[12px] text-[#A3A3A3] hover:bg-[#1D1D1D] hover:text-[#F5F5F5] transition"
                          onClick={() => setSubforumsOpen(false)}
                        >
                          {sub.name}
                        </Link>
                      );
                    })
                  ) : (
                    legacySubforumNames.map((sub) => (
                      <Link
                        key={sub}
                        href={`/forum/${forum.id}?sub=${encodeURIComponent(sub)}`}
                        className="block px-2.5 py-1.5 rounded-[4px] text-[12px] text-[#A3A3A3] hover:bg-[#1D1D1D] hover:text-[#F5F5F5] transition"
                        onClick={() => setSubforumsOpen(false)}
                      >
                        {sub}
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Mitte: Threads & Messages Zähler */}
      <div className="flex items-center gap-8 text-[12px] text-[#A3A3A3] shrink-0 md:px-4">
        <div className="text-center min-w-[50px]">
          <span className="font-bold text-[#F5F5F5] block text-[13px]">
            {formatCount(threadsCount)}
          </span>
          <span className="text-[10px] text-[#737373]">Threads</span>
        </div>
        <div className="text-center min-w-[50px]">
          <span className="font-bold text-[#F5F5F5] block text-[13px]">
            {formatCount(postsCount)}
          </span>
          <span className="text-[10px] text-[#737373]">Messages</span>
        </div>
      </div>

      {/* 3. Rechts: Letzter Beitrag */}
      <div className="min-w-[260px] max-w-sm text-[12px] shrink-0 border-t md:border-t-0 pt-2.5 md:pt-0 border-[#292929]/50">
        {latestThread ? (
          <div className="flex items-center gap-2.5">
            <img
              src={
                latestThread.author.avatarUrl ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80'
              }
              alt=""
              className="w-7 h-7 rounded-full object-cover border border-[#292929] shrink-0"
            />
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5 truncate">
                {latestThread.prefix && (
                  <span className="px-1.5 py-0.2 rounded-[3px] text-[10px] font-medium shrink-0 bg-[#222222] text-[#E5E5E5] border border-[#333333]">
                    {latestThread.prefix.name}
                  </span>
                )}
                <Link
                  href={`/forum/thread/${latestThread.id}`}
                  className="text-[#F5F5F5] hover:text-white font-medium block truncate transition"
                >
                  {latestThread.title}
                </Link>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[#737373]">
                <span>{formatTimeAgo(latestThread.lastActivityAt)}</span>
                <span>•</span>
                <span className="font-medium text-[#A3A3A3] truncate">
                  {latestThread.author.username}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <span className="text-[#737373] text-[12px]">Keine Beiträge</span>
        )}
      </div>
    </div>
  );
}
