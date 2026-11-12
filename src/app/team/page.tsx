import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Crown, Shield, Gamepad2, Mail, ExternalLink } from 'lucide-react';

export const revalidate = 0;

export default async function TeamPage() {
  // Alle Teammitglieder laden (Priority >= 40)
  const teamUsers = await prisma.user.findMany({
    where: {
      role: { priority: { gte: 40 } },
      isBanned: false,
    },
    include: {
      role: true,
    },
    orderBy: { role: { priority: 'desc' } },
  });

  // Nach Rollen gruppieren
  const rolesOrder = ['PROJEKTLEITUNG', 'ADMINISTRATOR', 'MODERATOR', 'SUPPORTER'];
  const groupedTeam: Record<string, typeof teamUsers> = {};

  for (const r of rolesOrder) {
    const list = teamUsers.filter((u) => u.role.name === r);
    if (list.length > 0) {
      groupedTeam[r] = list;
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-[#101624] border border-[#263247] p-6 sm:p-8 rounded-2xl shadow-xl text-center w-full space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-400">
          <Crown className="w-3.5 h-3.5" />
          <span>SERVERVERWALTUNG & MODERATION</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
          Das Vega Crimelife Team
        </h1>
        <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
          Unser engagiertes Team sorgt für einen reibungslosen Ablauf auf dem FiveM Server und im Forum. Bei Fragen oder Problemen kannst du uns jederzeit im Support kontaktieren.
        </p>
      </div>

      {/* Team Ränge */}
      <div className="space-y-10">
        {Object.entries(groupedTeam).map(([roleKey, members]) => {
          const firstMember = members[0];
          return (
            <div key={roleKey} className="space-y-4">
              <div className="flex items-center gap-3 border-b border-[#263247] pb-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: firstMember.role.color }}
                ></span>
                <h2 className="text-base font-extrabold text-white uppercase tracking-wider">
                  {firstMember.role.displayName}
                </h2>
                <span className="text-xs text-[#64748B]">({members.length})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="bg-[#151D2D] border border-[#263247] rounded-xl p-5 shadow-lg space-y-4 flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-3.5">
                      <img
                        src={
                          member.avatarUrl ||
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'
                        }
                        alt={member.username}
                        className="w-14 h-14 rounded-xl object-cover border-2 border-[#263247]"
                      />
                      <div className="min-w-0 space-y-1">
                        <Link
                          href={`/user/${member.username}`}
                          className="font-bold text-white text-base hover:text-[#4C8DFF] transition block truncate"
                        >
                          {member.username}
                        </Link>
                        <span
                          className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            color: member.role.color,
                            backgroundColor: member.role.badgeBg,
                          }}
                        >
                          {member.role.displayName}
                        </span>
                      </div>
                    </div>

                    {member.bio && (
                      <p className="text-xs text-[#94A3B8] line-clamp-2 leading-relaxed">
                        {member.bio}
                      </p>
                    )}

                    <div className="pt-3 border-t border-[#263247]/60 flex items-center justify-between text-xs text-[#94A3B8]">
                      {member.discordTag && (
                        <span className="text-[11px] text-[#965CFF] font-medium truncate">
                          {member.discordTag}
                        </span>
                      )}
                      <Link
                        href={`/user/${member.username}`}
                        className="text-xs text-[#4C8DFF] font-semibold hover:underline ml-auto"
                      >
                        Profil ansehen →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
