import { config } from '../config.js';

/**
 * Service to interact with the FiveM server HTTP endpoints.
 * Standard endpoints provided by fxserver / cfx:
 * - /info.json: Server build, resources, banner, vars
 * - /dynamic.json: hostname, clients, maxClients, gametype, mapname
 * - /players.json: current connected player list [{ id, name, ping, identifiers }]
 */
export class FiveMService {
  constructor(ip = config.fivem.ip, port = config.fivem.port) {
    this.ip = ip;
    this.port = port;
    this.baseUrl = `http://${ip}:${port}`;
    this.timeout = config.fivem.timeoutMs;
  }

  /**
   * Helper to fetch json with timeout
   */
  async fetchWithTimeout(endpoint) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'VEGA-CrimeLife-DiscordBot/1.0',
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  }

  /**
   * Get full server status
   */
  async getServerStatus() {
    const startTime = Date.now();
    try {
      const [dynamicData, playersData] = await Promise.all([
        this.fetchWithTimeout('/dynamic.json'),
        this.fetchWithTimeout('/players.json')
      ]);

      const ping = Date.now() - startTime;

      if (!dynamicData && !playersData) {
        return {
          online: false,
          ip: this.ip,
          port: this.port,
          connectUrl: `fivem://connect/${this.ip}:${this.port}`,
          hostname: `${config.brand.name} Roleplay Server`,
          clients: 0,
          maxClients: 128,
          ping: null,
          players: [],
          gametype: 'CrimeLife',
          mapname: 'Los Santos',
          lastChecked: new Date().toISOString()
        };
      }

      const players = Array.isArray(playersData) ? playersData : [];
      const clients = dynamicData?.clients ?? players.length;
      const maxClients = dynamicData?.sv_maxclients ?? dynamicData?.maxclients ?? 128;
      const hostname = dynamicData?.hostname ?? `${config.brand.name} Server`;

      return {
        online: true,
        ip: this.ip,
        port: this.port,
        connectUrl: `fivem://connect/${this.ip}:${this.port}`,
        hostname: hostname.replace(/\^[0-9]/g, ''), // Strip FiveM color codes
        clients,
        maxClients,
        ping,
        players,
        gametype: dynamicData?.gametype ?? 'CrimeLife',
        mapname: dynamicData?.mapname ?? 'Los Santos',
        lastChecked: new Date().toISOString()
      };
    } catch (err) {
      return {
        online: false,
        ip: this.ip,
        port: this.port,
        connectUrl: `fivem://connect/${this.ip}:${this.port}`,
        hostname: `${config.brand.name} Server`,
        clients: 0,
        maxClients: 128,
        ping: null,
        players: [],
        error: err.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Search connected players by name or server ID
   */
  async findOnlinePlayer(query) {
    const status = await this.getServerStatus();
    if (!status.online || !status.players.length) return [];

    const q = query.toLowerCase();
    return status.players.filter(p => {
      const idMatch = String(p.id) === q;
      const nameMatch = p.name && p.name.toLowerCase().includes(q);
      return idMatch || nameMatch;
    });
  }
}

export const fivemService = new FiveMService();
