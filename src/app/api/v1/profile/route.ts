import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateIntegrationKey } from '@/lib/integrations';
import { getCurrentUser } from '@/lib/auth';
import { sortPlayerRankings } from '@/lib/rankings';

export const revalidate = 0;

/**
 * GET /api/v1/profile?query=tornadoworker
 * oder /api/v1/profile?discordId=123456789
 * Liefert ein zusammengeführtes Profil aus Foren-Account, Discord-Verknüpfung und FiveM-Statistiken.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || searchParams.get('username');
    const discordId = searchParams.get('discordId');
    const discordTag = searchParams.get('discordTag');

    if (!query && !discordId && !discordTag) {
      return NextResponse.json(
        { error: 'MISSING_PARAM', message: 'Bitte gib einen Suchbegriff, Benutzernamen oder eine Discord-ID an.' },
        { status: 400 }
      );
    }

    // 1. Suche den Benutzer
    let user: any = null;

    if (discordId || discordTag) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            ...(discordTag ? [{ discordTag: { equals: discordTag } }] : []),
            ...(discordId ? [
              { discordTag: { equals: discordId } },
              { playerStatsSnapshot: { stablePlayerId: `discord:${discordId}` } },
            ] : []),
          ],
        },
        include: {
          role: true,
          playerStatsSnapshot: true,
          _count: {
            select: {
              threads: true,
              posts: true,
              warningsReceived: true,
              ticketsCreated: true,
            },
          },
        },
      });
    }

    if (!user && query) {
      const cleanRaw = query.trim();
      const cleanLower = cleanRaw.toLowerCase();
      const cleanNoSpaces = cleanLower.replace(/\s+/g, '');

      user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: { equals: cleanRaw } },
            { username: { equals: cleanLower } },
            { displayName: { equals: cleanRaw } },
          ],
        },
        include: {
          role: true,
          playerStatsSnapshot: true,
          _count: {
            select: {
              threads: true,
              posts: true,
              warningsReceived: true,
              ticketsCreated: true,
            },
          },
        },
      });

      if (!user) {
        // Toleranter Match
        const allUsers = await prisma.user.findMany({
          include: {
            role: true,
            playerStatsSnapshot: true,
            _count: {
              select: {
                threads: true,
                posts: true,
                warningsReceived: true,
                ticketsCreated: true,
              },
            },
          },
        });

        user = allUsers.find((u) => {
          const uName = u.username.toLowerCase();
          const dName = (u.displayName || '').toLowerCase();
          const uNoSpace = uName.replace(/\s+/g, '');
          const dNoSpace = dName.replace(/\s+/g, '');

          return (
            uName === cleanLower ||
            dName === cleanLower ||
            uNoSpace === cleanNoSpaces ||
            dNoSpace === cleanNoSpaces ||
            uName.includes(cleanLower) ||
            dName.includes(cleanLower)
          );
        }) || null;
      }
    }

    // 2. Wenn kein Foren-User gefunden wurde, prüfen wir ob vielleicht nur ein FiveM-Stats Snapshot existiert
    if (!user && query) {
      const cleanQuery = query.trim().toLowerCase();
      const snapshot = await prisma.playerStatsSnapshot.findFirst({
        where: {
          playerName: { contains: cleanQuery, mode: 'insensitive' },
        },
      });

      if (snapshot) {
        const kdRatio = snapshot.deaths > 0 ? (snapshot.kills / snapshot.deaths).toFixed(2) : snapshot.kills.toFixed(2);
        const headshotRate = snapshot.kills > 0 ? Math.round((snapshot.headshots / snapshot.kills) * 100) : 0;

        return NextResponse.json({
          found: true,
          isForumUser: false,
          statsOnly: true,
          player: {
            playerName: snapshot.playerName,
            factionName: snapshot.factionName,
            kills: snapshot.kills,
            deaths: snapshot.deaths,
            kdRatio: Number(kdRatio),
            headshots: snapshot.headshots,
            headshotRate,
            playtimeMinutes: snapshot.playtimeMinutes,
            wins: snapshot.wins,
            losses: snapshot.losses,
            rank: null,
          },
        });
      }

      return NextResponse.json({
        found: false,
        message: `Kein Profil für "${query}" gefunden.`,
      }, { status: 404 });
    }

    if (!user) {
      return NextResponse.json({
        found: false,
        message: 'Kein Benutzer gefunden.',
      }, { status: 404 });
    }

    // 3. Rang des Spielers ermitteln
    let rank = null;
    const allSnapshots = await prisma.playerStatsSnapshot.findMany({
      orderBy: [{ kills: 'desc' }, { headshots: 'desc' }],
    });
    const ranked = sortPlayerRankings(allSnapshots);
    const playerRankIndex = ranked.findIndex(
      (r) => r.playerName.toLowerCase() === (user.displayName || user.username).toLowerCase() || (user.playerStatsSnapshot && r.id === user.playerStatsSnapshot.id)
    );
    if (playerRankIndex !== -1) {
      rank = playerRankIndex + 1;
    }

    // 4. Offene Tickets zählen
    const openTicketsCount = await prisma.ticket.count({
      where: {
        authorId: user.id,
        status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'WAITING_FOR_STAFF'] },
      },
    });

    // 5. Neueste Threads des Nutzers
    const recentThreads = await prisma.thread.findMany({
      where: { authorId: user.id, isDeleted: false },
      select: { id: true, title: true, createdAt: true, viewsCount: true, repliesCount: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    const stats = user.playerStatsSnapshot;
    const kills = stats?.kills || 0;
    const deaths = stats?.deaths || 0;
    const headshots = stats?.headshots || 0;
    const kdRatio = deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2);
    const headshotRate = kills > 0 ? Math.round((headshots / kills) * 100) : 0;

    return NextResponse.json({
      found: true,
      isForumUser: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatarUrl: user.avatarUrl,
        bannerUrl: user.bannerUrl,
        bio: user.bio,
        role: {
          name: user.role.name,
          displayName: user.role.displayName,
          color: user.role.color,
          badgeBg: user.role.badgeBg,
        },
        discordTag: user.discordTag,
        isBanned: user.isBanned,
        createdAt: user.createdAt,
        lastActiveAt: user.lastActiveAt,
      },
      counts: {
        threads: user._count.threads,
        posts: user._count.posts,
        warnings: user._count.warningsReceived,
        openTickets: openTicketsCount,
        totalTickets: user._count.ticketsCreated,
      },
      stats: {
        hasStats: !!stats,
        factionName: stats?.factionName || null,
        kills,
        deaths,
        kdRatio: Number(kdRatio),
        headshots,
        headshotRate,
        playtimeMinutes: stats?.playtimeMinutes || 0,
        wins: stats?.wins || 0,
        losses: stats?.losses || 0,
        rank,
      },
      recentThreads,
    });
  } catch (err: any) {
    console.error('Error in /api/v1/profile:', err);
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
