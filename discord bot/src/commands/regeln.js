import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { BotEmbeds } from '../utils/embedBuilder.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('regeln')
  .setDescription('Zeigt das offizielle 8-Punkte Forum Regelwerk von VEGA CrimeLife');

export async function execute(interaction) {
  const embed = BotEmbeds.rules();
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Regelwerk im Forum öffnen')
      .setEmoji('📜')
      .setStyle(ButtonStyle.Link)
      .setURL(`${config.forum.url}/rules`)
  );
  await interaction.reply({ embeds: [embed], components: [buttons] });
}
