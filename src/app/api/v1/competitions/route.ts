import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateIntegrationKey, logIntegrationEvent } from '@/lib/integrations';

export const revalidate = 0;

/**
 * Öffentlicher GET Endpunkt für aktive Wettbewerbe (für Discord Bot / Ingame UI)
 */
export async function GET(req: NextRequest) {
  try {
    const competitions = await prisma.competition.findMany({
      where: {
        status: { in: ['REGISTRATION_OPEN', 'IN_PROGRESS', 'COMPLETED'] },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        format: true,
        status: true,
        maxParticipants: true,
        startDate: true,
        _count: { select: { participants: true, matches: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: competitions,
      meta: {
        count: competitions.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

/**
 * Vorbereiteter schreibender Endpunkt für Match-Ergebnisse über FiveM Server
 * Bleibt standardmäßig deaktiviert mit INTEGRATION_NOT_CONFIGURED
 */
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

  const auth = await authenticateIntegrationKey(apiKey);

  if (!auth.success) {
    return NextResponse.json(
      {
        error: auth.error || 'INTEGRATION_NOT_CONFIGURED',
        message: 'Wettbewerbs-Ergebnis-API ist deaktiviert oder nicht konfiguriert.',
        code: auth.error || 'INTEGRATION_NOT_CONFIGURED',
      },
      { status: auth.statusCode || 503 }
    );
  }

  try {
    const body = await req.json();
    const { matchId, externalMatchId, winnerStableId, challengerScore, challengedScore } = body;

    if (!matchId && !externalMatchId) {
      return NextResponse.json({ error: 'matchId oder externalMatchId erforderlich.' }, { status: 400 });
    }

    // Match prüfen
    const match = await prisma.competitionMatch.findFirst({
      where: matchId ? { id: matchId } : { externalMatchId },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match nicht gefunden.' }, { status: 404 });
    }

    // Match updaten
    const updated = await prisma.competitionMatch.update({
      where: { id: match.id },
      data: {
        status: 'COMPLETED',
        challengerScore: Number(challengerScore) || 0,
        challengedScore: Number(challengedScore) || 0,
        completedAt: new Date(),
        sourceType: 'FIVEM_API',
      },
    });

    await logIntegrationEvent({
      integrationId: auth.integration.id,
      level: 'INFO',
      endpoint: '/api/v1/competitions',
      method: 'POST',
      statusCode: 200,
      message: `Match ${match.id} Ergebnis importiert`,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, match: updated });
  } catch (err: any) {
    return NextResponse.json({ error: 'MATCH_UPDATE_FAILED', message: err.message }, { status: 500 });
  }
}
