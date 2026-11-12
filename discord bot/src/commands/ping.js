import { SlashCommandBuilder } from 'discord.js';
import { forumService } from '../services/forumService.js';
import { fivemService } from '../services/fivemService.js';
import { BotEmbeds } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Überprüft die Reaktionszeiten (Latenz) von Discord Bot, Forum und FiveM Server');

export async function execute(interaction) {
  await interaction.deferReply();

  const discordPing = interaction.client.ws.ping;

  // Forum API Latenz messen
  const forumStart = Date.now();
  let forumLatency = null;
  try {
    const health = await forumService.checkHealth();
    if (health.online) {
      forumLatency = Date.now() - forumStart;
    }
  } catch {
    forumLatency = null;
  }

  // FiveM Server Latenz messen
  let fivemLatency = null;
  try {
    const fivemStatus = await fivemService.getServerStatus();
    if (fivemStatus.online) {
      fivemLatency = fivemStatus.ping;
    }
  } catch {
    fivemLatency = null;
  }

  const embed = BotEmbeds.ping(discordPing, forumLatency, fivemLatency);
  await interaction.editReply({ embeds: [embed] });
}
