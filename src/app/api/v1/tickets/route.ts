import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateIntegrationKey } from '@/lib/integrations';

export const revalidate = 0;

/**
 * GET /api/v1/tickets?discordId=... oder ?username=...
 * Ruft die Support-Tickets eines verknüpften Spielers ab.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const discordId = searchParams.get('discordId');
    const discordTag = searchParams.get('discordTag');
    const username = searchParams.get('username');

    if (!discordId && !discordTag && !username) {
      return NextResponse.json({ error: 'discordId oder username erforderlich.' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(discordTag ? [{ discordTag: { equals: discordTag } }] : []),
          ...(discordId ? [
            { discordTag: { equals: discordId } },
            { playerStatsSnapshot: { stablePlayerId: `discord:${discordId}` } },
          ] : []),
          ...(username ? [
            { username: { equals: username.trim() } },
            { displayName: { equals: username.trim() } },
          ] : []),
        ],
      },
    });

    if (!user) {
      return NextResponse.json({ found: false, tickets: [] });
    }

    const tickets = await prisma.ticket.findMany({
      where: { authorId: user.id },
      include: {
        category: {
          select: { name: true, icon: true },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      found: true,
      user: {
        username: user.username,
        displayName: user.displayName || user.username,
      },
      tickets: tickets.map((t) => ({
        ticketNumber: t.ticketNumber,
        title: t.title,
        status: t.status,
        priority: t.priority,
        category: t.category.name,
        messagesCount: t._count.messages,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
