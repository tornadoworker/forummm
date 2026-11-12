import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/permissions';
import { createHash, randomBytes } from 'crypto';

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canAccessAdmin(user)) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const [configs, logs, competitions, matches] = await Promise.all([
      prisma.integrationConfig.findMany({ orderBy: { name: 'asc' } }),
      prisma.integrationLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.competition.findMany({
        include: {
          creator: { select: { username: true } },
          _count: { select: { participants: true, matches: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.competitionMatch.findMany({
        include: {
          challenger: { select: { id: true, username: true } },
          challenged: { select: { id: true, username: true } },
          winner: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return NextResponse.json({ configs, logs, competitions, matches });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canAccessAdmin(user)) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    // 1. Integration Status Toggle / API Key Generierung
    if (action === 'TOGGLE_INTEGRATION') {
      const { name, isEnabled } = body;
      const updated = await prisma.integrationConfig.upsert({
        where: { name },
        update: {
          isEnabled: Boolean(isEnabled),
          status: isEnabled ? 'CONNECTED' : 'DISCONNECTED',
        },
        create: {
          name,
          displayName: name,
          isEnabled: Boolean(isEnabled),
          status: isEnabled ? 'CONNECTED' : 'DISCONNECTED',
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'INTEGRATION_TOGGLED',
          targetType: 'INTEGRATION',
          targetId: name,
          details: `Integration ${name} auf ${isEnabled ? 'aktiviert' : 'deaktiviert'} gesetzt.`,
        },
      });

      return NextResponse.json({ success: true, config: updated });
    }

    // 2. Neuer API Schlüssel generieren
    if (action === 'GENERATE_API_KEY') {
      const { name } = body;
      const rawKey = `vega_${name.toLowerCase()}_${randomBytes(24).toString('hex')}`;
      const hashedKey = createHash('sha256').update(rawKey).digest('hex');

      const updated = await prisma.integrationConfig.upsert({
        where: { name },
        update: { apiKeyHash: hashedKey },
        create: {
          name,
          displayName: name,
          isEnabled: false,
          status: 'DISCONNECTED',
          apiKeyHash: hashedKey,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'INTEGRATION_KEY_GENERATED',
          targetType: 'INTEGRATION',
          targetId: name,
          details: `Neuer API Schlüssel für ${name} generiert.`,
        },
      });

      // Den Klartext-Schlüssel einmalig an den Admin zurückgeben
      return NextResponse.json({ success: true, rawKey, config: updated });
    }

    // 3. Wettbewerb Status / Moderation
    if (action === 'UPDATE_COMPETITION_STATUS') {
      const { competitionId, status } = body;
      const updated = await prisma.competition.update({
        where: { id: competitionId },
        data: { status },
      });

      return NextResponse.json({ success: true, competition: updated });
    }

    // 4. Match Ergebnis manuell eintragen / überschreiben
    if (action === 'UPDATE_MATCH_RESULT') {
      const { matchId, winnerId, score1, score2, status } = body;
      const updated = await prisma.competitionMatch.update({
        where: { id: matchId },
        data: {
          winnerId: winnerId || null,
          challengerScore: Number(score1) || 0,
          challengedScore: Number(score2) || 0,
          status: status || 'COMPLETED',
        },
      });

      return NextResponse.json({ success: true, match: updated });
    }

    return NextResponse.json({ error: 'Unbekannte Aktion.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
