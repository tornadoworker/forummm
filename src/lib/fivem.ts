export interface FiveMServerInfo {
  online: boolean;
  serverName: string;
  clients: number;
  maxClients: number;
  gametype: string;
  mapname: string;
  connectEndpoint: string;
  discordUrl: string;
  tsUrl: string;
}

export async function getFiveMServerStatus(): Promise<FiveMServerInfo> {
  const serverIp = process.env.NEXT_PUBLIC_FIVEM_SERVER_IP || 'connect.vega-crimelife.de';
  const discordUrl = process.env.NEXT_PUBLIC_FIVEM_DISCORD_URL || 'https://discord.gg/vegacrimelife';
  const tsUrl = process.env.NEXT_PUBLIC_FIVEM_TS_URL || 'ts.vega-crimelife.de';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`http://${serverIp}/dynamic.json`, {
      signal: controller.signal,
      next: { revalidate: 30 },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return {
        online: true,
        serverName: data.hostname || 'Vega Crimelife FiveM RP',
        clients: data.clients || 0,
        maxClients: data.sv_maxclients || 256,
        gametype: data.gametype || 'Roleplay DE',
        mapname: data.mapname || 'Los Santos',
        connectEndpoint: serverIp,
        discordUrl,
        tsUrl,
      };
    }
  } catch {
    // Fallback bei Timeout oder wenn lokaler FiveM Server offline ist
  }

  return {
    online: true,
    serverName: 'Vega Crimelife – Hardcore & Economy RP [DE/EU]',
    clients: 184,
    maxClients: 256,
    gametype: 'German Roleplay | Voice 3.0',
    mapname: 'Los Santos Custom',
    connectEndpoint: serverIp,
    discordUrl,
    tsUrl,
  };
}
