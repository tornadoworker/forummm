import { SlashCommandBuilder } from 'discord.js';
import { BotEmbeds } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Zeigt eine Übersicht aller verfügbaren VEGA CrimeLife Bot-Befehle');

export async function execute(interaction) {
  const embed = BotEmbeds.help();
  const buttons = BotEmbeds.helpButtons();
  await interaction.reply({ embeds: [embed], components: [buttons] });
}
