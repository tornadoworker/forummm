import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import {
  Shield,
  HeartHandshake,
  MessageSquare,
  AlertTriangle,
  Lock,
  User,
  Flag,
  Trophy,
  Scale,
  ExternalLink,
  LifeBuoy,
  ChevronRight,
  CheckCircle2,
  FileText
} from 'lucide-react';

export const revalidate = 0;

export const metadata = {
  title: 'Forum Regelwerk | VEGA CrimeLife',
  description: 'Verbindliche Verhaltens- und Forenregeln für alle Mitglieder auf VEGA CrimeLife.',
};

const FORUM_RULES = [
  {
    number: '1',
    title: 'Respekt',
    description:
      'Beleidigungen, Diskriminierung, Drohungen und gezielte Provokationen sind verboten. Kritik bleibt sachlich.',
    icon: HeartHandshake,
    badge: 'Verhalten',
  },
  {
    number: '2',
    title: 'Themen & Beiträge',
    description:
      'Nutze passende Kategorien und verständliche Titel. Spam, Doppelposts und absichtliches Stören von Diskussionen sind untersagt.',
    icon: MessageSquare,
    badge: 'Forenordnung',
  },
  {
    number: '3',
    title: 'Verbotene Inhalte',
    description:
      'Keine rechtswidrigen, pornografischen oder gewaltverherrlichenden Inhalte. Schadsoftware, Phishing und unerlaubte Werbung sind verboten.',
    icon: AlertTriangle,
    badge: 'Sicherheit',
  },
  {
    number: '4',
    title: 'Datenschutz',
    description:
      'Veröffentliche keine privaten Daten, Nachrichten oder vertraulichen Ticketinhalte ohne Zustimmung. Sensible Beweise gehören in den Support.',
    icon: Lock,
    badge: 'Privatsphäre',
  },
  {
    number: '5',
    title: 'Accounts & Profile',
    description:
      'Keine Identitätstäuschung oder zusätzlichen Accounts zur Umgehung von Sperren. Namen, Avatare und Signaturen müssen regelkonform sein.',
    icon: User,
    badge: 'Konto',
  },
  {
    number: '6',
    title: 'Beschwerden & Beweise',
    description:
      'Melde Verstöße über die vorgesehenen Funktionen. Öffentliche Hetze, falsche Anschuldigungen und manipulierte Beweise sind verboten.',
    icon: Flag,
    badge: 'Meldewesen',
  },
  {
    number: '7',
    title: 'Wettbewerbe & Statistiken',
    description:
      'Anmeldungen und Ergebnisse müssen wahrheitsgemäß sein. Ranglisten, Abstimmungen und Bewertungen dürfen nicht manipuliert werden.',
    icon: Trophy,
    badge: 'Fairplay',
  },
  {
    number: '8',
    title: 'Moderation & Konsequenzen',
    description:
      'Verstöße können zu Verwarnungen, Inhaltslöschungen oder Sperren führen. Moderationsentscheidungen dürfen sachlich über den Support angefochten werden.',
    icon: Scale,
    badge: 'Sanktionen',
  },
];

export default async function RulesPage() {
  // Offiziellen Thread in Server-Regeln laden
  const officialThread = await prisma.thread.findFirst({
    where: { title: 'Forum Regelwerk | VEGA CrimeLife', isDeleted: false },
    select: { id: true, createdAt: true, lastActivityAt: true },
  });

  return (
    <div className="space-y-6">
      {/* 1. BREADCRUMB */}
      <div className="flex items-center gap-2 text-xs text-[#A3A3A3]">
        <Link href="/" className="hover:text-[#F5F5F5] transition">
          Startseite
        </Link>
        <ChevronRight className="w-3 h-3 text-[#555555]" />
        <Link href="/forum" className="hover:text-[#F5F5F5] transition">
          Forum
        </Link>
        <ChevronRight className="w-3 h-3 text-[#555555]" />
        <span className="text-[#F5F5F5] font-medium">Regelwerk</span>
      </div>

      {/* 2. HEADER HERO */}
      <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-5 sm:p-7 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#8B5CF6] text-[11px] font-bold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            <span>Offizielle Richtlinien</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F5F5F5] tracking-tight">
            Forum Regelwerk <span className="text-[#8B5CF6]">| VEGA CrimeLife</span>
          </h1>

          <p className="text-xs sm:text-sm text-[#A3A3A3] leading-relaxed">
            Das verbindliche Fundament für ein faires, respektvolles und konstruktives Miteinander auf allen Plattformen von Vega CrimeLife. Mit der Registrierung und Nutzung des Forums erkennt jedes Mitglied diese Regeln an.
          </p>
        </div>

        {officialThread && (
          <div className="relative z-10 shrink-0">
            <Link
              href={`/forum/thread/${officialThread.id}`}
              className="h-9 px-4 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-medium rounded-[6px] transition inline-flex items-center gap-2 shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Im Forum ansehen</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* 3. DIE 8 REGELN ALS STRUKTURIERTE KARTEN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FORUM_RULES.map((rule) => {
          const Icon = rule.icon;
          return (
            <div
              key={rule.number}
              className="bg-[#161616] hover:bg-[#1A1A1A] border border-[#292929] hover:border-[#8B5CF6]/40 rounded-[8px] p-5 transition flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-[6px] bg-[#111111] border border-[#292929] flex items-center justify-center text-[#8B5CF6] group-hover:border-[#8B5CF6]/40 transition">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-[#8B5CF6] uppercase font-mono">
                      § {rule.number}
                    </span>
                  </div>

                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[4px] bg-[#111111] border border-[#292929] text-[#737373]">
                    {rule.badge}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-[#F5F5F5] group-hover:text-[#8B5CF6] transition">
                  {rule.number}. {rule.title}
                </h3>

                <p className="text-xs text-[#A3A3A3] leading-relaxed">
                  {rule.description}
                </p>
              </div>

              <div className="pt-2 border-t border-[#292929]/60 flex items-center gap-1.5 text-[11px] text-[#737373]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80" />
                <span>Verbindlich für alle Forenbereiche</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. FOOTER INFO CARD / SUPPORT */}
      <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[6px] bg-[#111111] border border-[#292929] flex items-center justify-center text-[#8B5CF6] shrink-0">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#F5F5F5]">Fragen zum Regelwerk oder Einspruch?</h3>
            <p className="text-xs text-[#A3A3A3] mt-0.5">
              Unser Team hilft dir im Support-Bereich gerne weiter. Einsprüche gegen Verwarnungen werden dort sachlich geprüft.
            </p>
          </div>
        </div>

        <Link
          href="/support"
          className="h-8 px-4 bg-[#111111] hover:bg-[#1D1D1D] text-[#8B5CF6] border border-[#292929] hover:border-[#8B5CF6]/40 rounded-[5px] text-xs font-medium transition inline-flex items-center gap-1.5 shrink-0"
        >
          <span>Support kontaktieren</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
