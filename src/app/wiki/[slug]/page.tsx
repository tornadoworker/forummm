import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatTimeAgo, formatCustomDate } from '@/lib/utils';
import { BookOpen, ChevronRight, Eye, Calendar, ArrowLeft, User } from 'lucide-react';

export const revalidate = 0;

export default async function WikiArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const currentUser = await getCurrentUser();

  const article = await prisma.wikiArticle.update({
    where: { slug },
    data: { viewsCount: { increment: 1 } },
    include: {
      category: {
        include: {
          articles: {
            where: { isPublished: true },
            select: { id: true, title: true, slug: true },
          },
        },
      },
      author: {
        select: { username: true, role: true, avatarUrl: true },
      },
    },
  }).catch(() => null);

  if (!article) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
        <Link href="/wiki" className="hover:text-white transition">
          Wiki
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
        <span>{article.category.name}</span>
        <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
        <span className="text-white font-medium truncate max-w-xs">{article.title}</span>
      </div>

      {/* Grid: Links Artikel-Inhalt, Rechts Navigation in dieser Kategorie */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ARTIKEL INHALT */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-[#151D2D] border border-[#263247] rounded-xl p-6 sm:p-8 shadow-xl space-y-4">
            <div className="border-b border-[#263247] pb-4 space-y-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#101624] text-[#4C8DFF] border border-[#263247]">
                {article.category.name}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {article.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#64748B] pt-1">
                <span>
                  Verfasst von{' '}
                  <span
                    className="font-semibold"
                    style={{ color: article.author.role.color }}
                  >
                    {article.author.username}
                  </span>
                </span>
                <span>•</span>
                <span>Stand: {formatCustomDate(article.updatedAt)}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {article.viewsCount} Aufrufe
                </span>
              </div>
            </div>

            <div className="text-sm text-[#F3F6FC] leading-relaxed whitespace-pre-line space-y-3 pt-2">
              {article.content}
            </div>
          </div>
        </div>

        {/* SIDEBAR NAVIGATION IN DER KATEGORIE */}
        <div className="space-y-4">
          <div className="bg-[#151D2D] border border-[#263247] rounded-xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#263247] pb-2">
              In dieser Kategorie
            </h3>
            <div className="space-y-1.5 text-xs">
              {article.category.articles.map((other) => (
                <Link
                  key={other.id}
                  href={`/wiki/${other.slug}`}
                  className={`p-2 rounded block transition ${
                    other.slug === article.slug
                      ? 'bg-[#4C8DFF]/15 text-[#4C8DFF] font-semibold border border-[#4C8DFF]/30'
                      : 'text-[#94A3B8] hover:text-white hover:bg-[#101624]'
                  }`}
                >
                  {other.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
