import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { forumService } from '../services/forumService.js';
import { BotEmbeds } from '../utils/embedBuilder.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Zeigt deine offenen Support-Tickets im VEGA CrimeLife Forum an')
  .addStringOption(option =>
    option
      .setName('username')
      .setDescription('Dein Forum-Benutzername (falls dein Discord noch nicht verknüpft ist)')
      .setRequired(false)
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const inputUsername = interaction.options.getString('username');
  const discordUser = interaction.user;

  try {
    const data = await forumService.getUserTickets({
      discordId: discordUser.id,
      discordTag: discordUser.tag || discordUser.username,
      username: inputUsername,
    });

    const embed = BotEmbeds.tickets(data);

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Neues Ticket erstellen')
        .setEmoji('🎫')
        .setStyle(ButtonStyle.Link)
        .setURL(`${config.forum.url}/support`),
      new ButtonBuilder()
        .setLabel('Support Center öffnen')
        .setEmoji('🌐')
        .setStyle(ButtonStyle.Link)
        .setURL(`${config.forum.url}/support`)
    );

    await interaction.editReply({ embeds: [embed], components: [buttons] });
  } catch (error) {
    console.error('Error in /ticket command:', error);
    await interaction.editReply({
      embeds: [BotEmbeds.error('Fehler bei der Ticket-Abfrage', error.message)],
    });
  }
}
