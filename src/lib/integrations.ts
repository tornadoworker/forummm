import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export type IntegrationType = 'FIVEM_SERVER' | 'DISCORD_BOT' | 'INGAME_UI';

export const INTEGRATION_NAMES: Record<IntegrationType, string> = {
  FIVEM_SERVER: 'FiveM Game Server',
  DISCORD_BOT: 'Discord Community Bot',
  INGAME_UI: 'In-Game NUI Dashboard',
};

/**
 * Initialisiert Standardkonfigurationen in der DB, falls noch nicht vorhanden
 */
export async function getOrCreateIntegrationConfigs() {
  const defaults: { name: IntegrationType; displayName: string; description: string; rateLimit: number }[] = [
    {
      name: 'FIVEM_SERVER',
      displayName: 'FiveM Game Server',
      description: 'Überträgt Kills, Tode, Kopfschüsse und Match-Ergebnisse sicher über Server-Events.',
      rateLimit: 120,
    },
    {
      name: 'DISCORD_BOT',
      displayName: 'Discord Community Bot',
      description: 'Empfängt Benachrichtigungen zu Wettbewerben und ruft Ranglisten für Discord-Befehle ab.',
      rateLimit: 60,
    },
    {
      name: 'INGAME_UI',
      displayName: 'In-Game NUI Dashboard',
      description: 'Erlaubt das Abrufen von Ranglisten und Wettbewerbsübersichten direkt im Spiel.',
      rateLimit: 90,
    },
  ];

  for (const def of defaults) {
    const existing = await prisma.integrationConfig.findUnique({ where: { name: def.name } });
    if (!existing) {
      await prisma.integrationConfig.create({
        data: {
          name: def.name,
          displayName: def.displayName,
          description: def.description,
          isEnabled: false,
          status: 'NOT_CONFIGURED',
          rateLimitPerMin: def.rateLimit,
        },
      });
    }
  }

  return prisma.integrationConfig.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { logs: true } },
    },
  });
}

/**
 * Validiert einen API-Key gegen die hinterlegte Integration
 */
export async function authenticateIntegrationKey(apiKey: string | null | undefined): Promise<{
  success: boolean;
  integration?: any;
  error?: string;
  statusCode?: number;
}> {
  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      error: 'INTEGRATION_KEY_MISSING',
      statusCode: 401,
    };
  }

  const cleanKey = apiKey.trim();
  const hash = crypto.createHash('sha256').update(cleanKey).digest('hex');

  let integration = await prisma.integrationConfig.findFirst({
    where: {
      apiKeyHash: hash,
    },
  });

  // Fallback: Prüfe Umgebungskonfiguration für Discord Bot oder FiveM
  if (!integration) {
    const envBotKey = process.env.DISCORD_INTEGRATION_API_KEY;
    const envFivemKey = process.env.FIVEM_INTEGRATION_API_KEY;

    if (envBotKey && cleanKey === envBotKey) {
      integration = await prisma.integrationConfig.findUnique({ where: { name: 'DISCORD_BOT' } });
      if (integration) {
        // Auto-Heal: Schlüssel-Hash in DB eintragen und aktivieren
        integration = await prisma.integrationConfig.update({
          where: { id: integration.id },
          data: {
            apiKeyHash: hash,
            apiKeyPrefix: 'vga_bot',
            isEnabled: true,
            status: 'CONNECTED',
            lastSyncAt: new Date(),
          },
        });
      }
    } else if (envFivemKey && cleanKey === envFivemKey) {
      integration = await prisma.integrationConfig.findUnique({ where: { name: 'FIVEM_SERVER' } });
      if (integration) {
        integration = await prisma.integrationConfig.update({
          where: { id: integration.id },
          data: {
            apiKeyHash: hash,
            apiKeyPrefix: 'vga_fivem',
            isEnabled: true,
            status: 'CONNECTED',
            lastSyncAt: new Date(),
          },
        });
      }
    }
  }

  if (!integration) {
    return {
      success: false,
      error: 'INVALID_INTEGRATION_KEY',
      statusCode: 403,
    };
  }

  if (!integration.isEnabled || integration.status !== 'CONNECTED') {
    return {
      success: false,
      error: 'INTEGRATION_NOT_CONFIGURED',
      statusCode: 503,
    };
  }

  return {
    success: true,
    integration,
  };
}

/**
 * Protokolliert Anfragen an Integrationsschnittstellen
 */
export async function logIntegrationEvent(params: {
  integrationId: string;
  level?: 'INFO' | 'WARN' | 'ERROR';
  endpoint: string;
  method: string;
  statusCode: number;
  message: string;
  ipAddress?: string;
}) {
  try {
    await prisma.integrationLog.create({
      data: {
        integrationId: params.integrationId,
        level: params.level || 'INFO',
        endpoint: params.endpoint,
        method: params.method,
        statusCode: params.statusCode,
        message: params.message.slice(0, 1000),
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (err) {
    console.error('Failed to write integration log:', err);
  }
}
