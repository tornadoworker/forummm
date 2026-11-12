import { NextResponse } from 'next/server';
import { validateSsrfTarget } from '@/lib/ssrf';

export const revalidate = 30; // 30 Sekunden Caching

export async function GET() {
  const serverAddress = process.env.FIVEM_SERVER_IP || 'play.vega-crimelife.de';
  const serverPort = process.env.FIVEM_SERVER_PORT || '30120';
  const cfxCode = process.env.FIVEM_CFX_CODE; // optional FiveM join code

  try {
    let online = false;
    let players = 0;
    let maxPlayers = 0;

    // 1. Wenn ein CFX Code existiert, prüfe die offizielle FiveM API
    if (cfxCode) {
      const cfxRes = await fetch(`https://servers-frontend.fivem.net/api/servers/single/${cfxCode}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        next: { revalidate: 30 },
      });

      if (cfxRes.ok) {
        const data = await cfxRes.json();
        if (data?.Data) {
          online = true;
          players = data.Data.clients || 0;
          maxPlayers = data.Data.sv_maxclients || 128;
        }
      }
    }

    // 2. Direkte Abfrage des FiveM Server Endpoints (dynamic.json) mit SSRF-Schutz
    if (!online) {
      const targetUrl = `http://${serverAddress}:${serverPort}/dynamic.json`;
      const ssrfCheck = await validateSsrfTarget(targetUrl);

      if (ssrfCheck.safe) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const dynamicRes = await fetch(targetUrl, {
          signal: controller.signal,
        }).catch(() => null);

        clearTimeout(timeoutId);

        if (dynamicRes && dynamicRes.ok) {
          const data = await dynamicRes.json();
          online = true;
          players = data.clients || 0;
          maxPlayers = data.sv_maxclients || 128;
        }
      }
    }

    if (!online) {
      return NextResponse.json({
        online: false,
        statusText: 'Status nicht verfügbar',
        address: serverAddress,
        players: null,
        maxPlayers: null,
      });
    }

    return NextResponse.json({
      online: true,
      statusText: 'Online',
      address: serverAddress,
      players,
      maxPlayers,
    });
  } catch {
    return NextResponse.json({
      online: false,
      statusText: 'Status nicht verfügbar',
      address: serverAddress,
      players: null,
      maxPlayers: null,
    });
  }
}
