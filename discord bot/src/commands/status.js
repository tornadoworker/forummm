import { SlashCommandBuilder } from 'discord.js';
import { fivemService } from '../services/fivemService.js';
import { forumService } from '../services/forumService.js';
import { BotEmbeds } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Zeigt den aktuellen Live-Status von FiveM Server & Forum mit Direkt-Aktionen an');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const [fivemStatus, forumStatus] = await Promise.all([
      fivemService.getServerStatus(),
      forumService.checkHealth(),
    ]);

    const embed = BotEmbeds.serverStatus(fivemStatus, forumStatus);
    const buttons = BotEmbeds.statusButtons(fivemStatus?.connectUrl, forumStatus?.url);

    await interaction.editReply({ embeds: [embed], components: [buttons] });
  } catch (error) {
    console.error('Error in /status command:', error);
    await interaction.editReply({
      embeds: [BotEmbeds.error('Fehler beim Abrufen des Status', error.message)],
    });
  }
}
