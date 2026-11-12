import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { fivemService } from '../services/fivemService.js';
import { BotEmbeds } from '../utils/embedBuilder.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('players')
  .setDescription('Zeigt alle aktuell verbundenen Spieler auf dem FiveM Server mit Server-ID & Ping an');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const status = await fivemService.getServerStatus();
    const embed = BotEmbeds.onlinePlayers(status);

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Server beitreten')
        .setEmoji('🎮')
        .setStyle(ButtonStyle.Link)
        .setURL(status.connectUrl || config.fivem.connectUrl)
    );

    await interaction.editReply({ embeds: [embed], components: [buttons] });
  } catch (error) {
    console.error('Error in /players command:', error);
    await interaction.editReply({
      embeds: [BotEmbeds.error('Fehler beim Abrufen der Spielerliste', error.message)],
    });
  }
}
