import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { forumService } from '../services/forumService.js';
import { BotEmbeds } from '../utils/embedBuilder.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('turniere')
  .setDescription('Zeigt alle aktuellen Turniere, Duelle und Wettbewerbe an');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const competitions = await forumService.getCompetitions();
    const embed = BotEmbeds.competitions(competitions);

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Wettbewerbe im Forum ansehen')
        .setEmoji('⚔️')
        .setStyle(ButtonStyle.Link)
        .setURL(`${config.forum.url}/competitions`)
    );

    await interaction.editReply({ embeds: [embed], components: [buttons] });
  } catch (error) {
    console.error('Error in /turniere command:', error);
    await interaction.editReply({
      embeds: [BotEmbeds.error('Fehler beim Abrufen der Wettbewerbe', error.message)],
    });
  }
}
