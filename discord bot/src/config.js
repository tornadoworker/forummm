import dotenv from 'dotenv';
dotenv.config();

export const config = {
  discord: {
    token: process.env.DISCORD_TOKEN || '',
    clientId: process.env.CLIENT_ID || '',
    guildId: process.env.GUILD_ID || null,
  },
  fivem: {
    ip: process.env.FIVEM_IP || 'play.vega-crimelife.de',
    port: parseInt(process.env.FIVEM_PORT || '30120', 10),
    connectUrl: `fivem://connect/${process.env.FIVEM_IP || 'play.vega-crimelife.de'}:${process.env.FIVEM_PORT || '30120'}`,
    timeoutMs: 4000,
  },
  forum: {
    url: (process.env.FORUM_API_URL || 'http://localhost:3000').replace(/\/+$/, ''),
    apiKey: process.env.FORUM_API_KEY || '',
  },
  brand: {
    name: 'VEGA CrimeLife',
    colorHex: 0x8b5cf6, // Purple accent matching VEGA design
    monochromeHex: 0x111115, // Dark sleek card background
    successHex: 0x22c55e,
    dangerHex: 0xef4444,
    warningHex: 0xf59e0b,
    iconUrl: 'https://i.imgur.com/8QzQy3U.png', // Fallback avatar/brand icon
    websiteUrl: 'http://localhost:3000',
  }
};
