import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateIntegrationKey, logIntegrationEvent } from '@/lib/integrations';
import { sortPlayerRankings } from '@/lib/rankings';

export const revalidate = 0;

/**
 * Öffentlicher GET Endpunkt für Ranglisten (kann später von In-Game NUI oder Discord genutzt werden)
 * Enthält KEINE privaten Benutzerdaten oder internen Secrets.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 20, 1), 100);

    const snapshots = await prisma.playerStatsSnapshot.findMany({
      select: {
        id: true,
        playerName: true,
        factionName: true,
        kills: true,
        deaths: true,
        headshots: true,
        playtimeMinutes: true,
        wins: true,
        losses: true,
      },
      orderBy: [{ kills: 'desc' }, { headshots: 'desc' }],
      take: limit,
    });

    const ranked = sortPlayerRankings(snapshots);

    return NextResponse.json({
      success: true,
      data: ranked,
      meta: {
        count: ranked.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: err.message },
      { status: 500 }
    );
  }
}

/**
 * Vorbereiteter schreibender API-Endpunkt für FiveM-Server (v1).
 * Bleibt standardmäßig DEAKTIVIERT und liefert INTEGRATION_NOT_CONFIGURED.
 * Idempotente Verarbeitung über eventId und serverseitige Validierung.
 */
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

  // 1. Authentifizierung & Deaktivierungsprüfung
  const auth = await authenticateIntegrationKey(apiKey);

  if (!auth.success) {
    return NextResponse.json(
      {
        error: auth.error || 'INTEGRATION_NOT_CONFIGURED',
        message:
          auth.error === 'INTEGRATION_NOT_CONFIGURED'
            ? 'Die Server-Integration ist derzeit nicht konfiguriert oder deaktiviert. Keine Daten wurden importiert.'
            : 'Ungültiger oder fehlender Integrations-Schlüssel.',
        code: auth.error || 'INTEGRATION_NOT_CONFIGURED',
      },
      { status: auth.statusCode || 503 }
    );
  }

  // 2. Wenn aktiv: Validierung & Idempotenz
  try {
    const body = await req.json();
    const { eventId, eventType, sourceServer, stablePlayerId, payload } = body;

    if (!eventId || !eventType || !stablePlayerId) {
      await logIntegrationEvent({
        integrationId: auth.integration.id,
        level: 'WARN',
        endpoint: '/api/v1/stats',
        method: 'POST',
        statusCode: 400,
        message: 'Fehlende Pflichtfelder in Event-Payload',
        ipAddress: ip,
      });

      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'eventId, eventType und stablePlayerId sind Pflichtfelder.' },
        { status: 400 }
      );
    }

    // Idempotenz-Prüfung: Bereits verarbeitet?
    const existing = await prisma.statEvent.findUnique({ where: { eventId } });
    if (existing) {
      return NextResponse.json({
        success: true,
        status: 'ALREADY_PROCESSED',
        eventId,
      });
    }

    // Event persistent speichern
    await prisma.statEvent.create({
      data: {
        eventId,
        eventType,
        sourceServer: sourceServer || 'fivem-server',
        stablePlayerId,
        payload: typeof payload === 'string' ? payload : JSON.stringify(payload || {}),
        occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
      },
    });

    await logIntegrationEvent({
      integrationId: auth.integration.id,
      level: 'INFO',
      endpoint: '/api/v1/stats',
      method: 'POST',
      statusCode: 200,
      message: `Event ${eventType} (${eventId}) empfangen`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      eventId,
      status: 'RECORDED',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'EVENT_PROCESSING_FAILED', message: err.message },
      { status: 500 }
    );
  }
}
