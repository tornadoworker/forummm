import React from 'react';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import CompetitionsClient from '@/components/CompetitionsClient';

export const revalidate = 0;

export const metadata = {
  title: 'Wettbewerbe | VEGA CrimeLife',
  description: '1v1 Duelle und Team-Turniere auf VEGA CrimeLife.',
};

export default async function CompetitionsPage() {
  const currentUser = await getCurrentUser();

  // Bestehende Wettbewerbe abfragen
  let competitions = await prisma.competition.findMany({
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          role: { select: { displayName: true, color: true } },
        },
      },
      _count: {
        select: { participants: true, matches: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Falls noch keine Wettbewerbe existieren: Initialbeispiele für die Community erstellen
  if (competitions.length === 0 && currentUser) {
    try {
      const demo1 = await prisma.competition.create({
        data: {
          title: 'Vega Spring Shootout 2026',
          slug: 'vega-spring-shootout-2026',
          description: 'Das größte 1v1 Heavy Pistol Turnier der Saison. 16 Schützen kämpfen um den Titel des besten Shooters.',
          rules: 'Heavy Pistol only, kein Armour-Spam, Best of 5 Runden im K.O.-System.',
          type: '1V1',
          status: 'REGISTRATION_OPEN',
          maxParticipants: 16,
          creatorId: currentUser.id,
        },
      });

      const demo2 = await prisma.competition.create({
        data: {
          title: 'East Side Gang Clash (4v4)',
          slug: 'east-side-gang-clash-4v4',
          description: 'Offizieller Fraktions-Wettkampf zwischen den Street Gangs von Los Santos. Taktik, Teamwork und Zielgenauigkeit.',
          rules: '4 Spieler pro Team, AR & SMG erlaubt, 3 Runden pro Match.',
          type: 'TEAM',
          status: 'REGISTRATION_OPEN',
          maxParticipants: 8,
          creatorId: currentUser.id,
        },
      });

      competitions = await prisma.competition.findMany({
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              role: { select: { displayName: true, color: true } },
            },
          },
          _count: {
            select: { participants: true, matches: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e) {
      console.error('Failed to create demo competitions:', e);
    }
  }

  // Direkte 1v1 Duelle
  const directMatches = await prisma.competitionMatch.findMany({
    where: { competitionId: null },
    include: {
      challenger: { select: { id: true, username: true, avatarUrl: true } },
      challenged: { select: { id: true, username: true, avatarUrl: true } },
      winner: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return (
    <CompetitionsClient
      initialCompetitions={competitions as any}
      initialDirectMatches={directMatches as any}
      currentUser={
        currentUser
          ? {
              id: currentUser.id,
              username: currentUser.username,
              role: {
                canAccessAdmin: currentUser.role.canAccessAdmin,
                displayName: currentUser.role.displayName,
              },
            }
          : null
      }
    />
  );
}
