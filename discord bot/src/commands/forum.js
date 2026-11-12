import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { forumService } from '../services/forumService.js';
import { BotEmbeds } from '../utils/embedBuilder.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('forum')
  .setDescription('Zeigt die neuesten Diskussionen und Themen im VEGA CrimeLife Forum');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const threads = await forumService.getLatestThreads(5);
    const embed = BotEmbeds.forumThreads(threads);
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Forum öffnen')
        .setEmoji('🌐')
        .setStyle(ButtonStyle.Link)
        .setURL(config.forum.url)
    );
    await interaction.editReply({ embeds: [embed], components: [buttons] });
  } catch (error) {
    console.error('Error in /forum command:', error);
    await interaction.editReply({
      embeds: [BotEmbeds.error('Fehler beim Abrufen der Forum-Themen', error.message)],
    });
  }
}
