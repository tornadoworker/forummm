import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import DynamicIcon from '@/components/DynamicIcon';
import { formatTimeAgo } from '@/lib/utils';
import { BookOpen, Search, Eye, ChevronRight, FileText, Sparkles } from 'lucide-react';

export const revalidate = 0;

export default async function WikiOverviewPage() {
  const categories = await prisma.wikiCategory.findMany({
    orderBy: { order: 'asc' },
    include: {
      articles: {
        where: { isPublished: true },
        orderBy: { order: 'asc' },
        include: {
          author: { select: { username: true, role: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-[#101624] border border-[#263247] p-6 sm:p-8 rounded-2xl shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#4C8DFF]">
          <BookOpen className="w-4 h-4" />
          <span>WISSENSDATENBANK & GUIDES</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">
          Vega Crimelife Wiki
        </h1>
        <p className="text-xs sm:text-sm text-[#94A3B8] max-w-3xl leading-relaxed">
          Hier findest du offizielle Leitfäden, Dokumentationen über unsere Custom Systeme, Fraktionsregeln und Tipps für erfolgreiches Roleplay.
        </p>
      </div>

      {/* Wiki Kategorien & Artikel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-[#151D2D] border border-[#263247] rounded-xl p-6 shadow-xl space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3 border-b border-[#263247] pb-3">
                <div className="w-9 h-9 rounded-lg bg-[#101624] border border-[#263247] flex items-center justify-center text-[#4C8DFF]">
                  <DynamicIcon name={cat.icon} className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    {cat.name}
                  </h2>
                  <span className="text-[11px] text-[#64748B]">
                    {cat.articles.length} {cat.articles.length === 1 ? 'Artikel' : 'Artikel'}
                  </span>
                </div>
              </div>

              {cat.description && (
                <p className="text-xs text-[#94A3B8]">{cat.description}</p>
              )}

              {/* Artikelliste */}
              <div className="space-y-2 pt-2">
                {cat.articles.map((art) => (
                  <Link
                    key={art.id}
                    href={`/wiki/${art.slug}`}
                    className="p-2.5 bg-[#101624] hover:bg-[#1A2438] border border-[#263247] rounded-lg transition flex items-center justify-between text-xs text-white group block"
                  >
                    <span className="font-semibold group-hover:text-[#4C8DFF] transition truncate">
                      {art.title}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#4C8DFF] group-hover:translate-x-0.5 transition shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
