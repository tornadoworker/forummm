import { config } from '../config.js';

export class ForumService {
  constructor(baseUrl = config.forum.url) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /**
   * Safe fetch with timeout
   */
  async fetchJson(endpoint, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const url = `${this.baseUrl}${endpoint}`;
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'VEGA-CrimeLife-DiscordBot/1.0',
          ...(config.forum.apiKey ? { 'x-api-key': config.forum.apiKey } : {}),
          ...(options.headers || {}),
        },
      });
      clearTimeout(timeout);

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        return json || null;
      }
      return json;
    } catch {
      clearTimeout(timeout);
      return null;
    }
  }

  /**
   * Health check for forum
   */
  async checkHealth() {
    try {
      const data = await this.fetchJson('/api/v1/stats?limit=1');
      return {
        online: data !== null,
        url: this.baseUrl,
        lastChecked: new Date().toISOString(),
      };
    } catch {
      return {
        online: false,
        url: this.baseUrl,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Fetch rankings & player stats
   */
  async getRankings(limit = 10) {
    const json = await this.fetchJson(`/api/v1/stats?limit=${limit}`);
    if (!json || !json.data) {
      return [];
    }
    return json.data;
  }

  /**
   * Find stats for a specific player by name
   */
  async getPlayerStats(playerName) {
    const rankings = await this.getRankings(100);
    if (!rankings || !rankings.length) return null;

    const query = playerName.trim().toLowerCase();
    const exact = rankings.find(p => p.playerName.toLowerCase() === query);
    if (exact) return exact;

    return rankings.find(p => p.playerName.toLowerCase().includes(query)) || null;
  }

  /**
   * Fetch competitions
   */
  async getCompetitions() {
    const json = await this.fetchJson('/api/v1/competitions');
    if (!json || !json.data) {
      return [];
    }
    return json.data;
  }

  /**
   * Fetch latest forum threads
   */
  async getLatestThreads(limit = 5) {
    const json = await this.fetchJson(`/api/threads?limit=${limit}`);
    if (!json || !json.data) {
      return [];
    }
    return json.data;
  }

  /**
   * Search forum
   */
  async searchForum(query) {
    const json = await this.fetchJson(`/api/search?q=${encodeURIComponent(query)}`);
    return json || { threads: [], posts: [], users: [], forums: [] };
  }

  /**
   * Check if Discord user is already linked
   */
  async checkDiscordLinked(discordId) {
    const json = await this.fetchJson(`/api/v1/verify?discordId=${discordId}`);
    return json || { linked: false };
  }

  /**
   * Link Discord user to forum user
   */
  async linkDiscordAccount(username, discordId, discordTag) {
    const json = await this.fetchJson('/api/v1/verify', {
      method: 'POST',
      body: JSON.stringify({ username, discordId, discordTag }),
    });
    return json;
  }

  /**
   * Get unified user profile
   */
  async getProfile({ query, discordId, discordTag }) {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (discordId) params.append('discordId', discordId);
    if (discordTag) params.append('discordTag', discordTag);

    const json = await this.fetchJson(`/api/v1/profile?${params.toString()}`);
    return json;
  }

  /**
   * Get tickets for user
   */
  async getUserTickets({ discordId, discordTag, username }) {
    const params = new URLSearchParams();
    if (discordId) params.append('discordId', discordId);
    if (discordTag) params.append('discordTag', discordTag);
    if (username) params.append('username', username);

    const json = await this.fetchJson(`/api/v1/tickets?${params.toString()}`);
    return json;
  }
}

export const forumService = new ForumService();


