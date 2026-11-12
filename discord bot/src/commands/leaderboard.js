import { SlashCommandBuilder } from 'discord.js';
import { forumService } from '../services/forumService.js';
import { BotEmbeds } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('Zeigt die Top 10 Best Shooter Rangliste an');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const players = await forumService.getRankings(10);
    const embed = BotEmbeds.leaderboard(players);
    const buttons = BotEmbeds.leaderboardButtons();
    await interaction.editReply({ embeds: [embed], components: [buttons] });
  } catch (error) {
    console.error('Error in /leaderboard command:', error);
    await interaction.editReply({
      embeds: [BotEmbeds.error('Fehler beim Laden des Leaderboards', error.message)],
    });
  }
}
