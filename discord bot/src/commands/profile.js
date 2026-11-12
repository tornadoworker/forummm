import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { forumService } from '../services/forumService.js';
import { BotEmbeds } from '../utils/embedBuilder.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('Ruft ein umfassendes Profil (Forum, Discord, FiveM K/D & Statistiken) ab')
  .addUserOption(option =>
    option
      .setName('discord_user')
      .setDescription('Wähle einen Discord-Nutzer aus')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('name')
      .setDescription('Forum-Benutzername oder In-Game Spielername')
      .setRequired(false)
  );

export async function execute(interaction) {
  await interaction.deferReply();

  const targetDiscordUser = interaction.options.getUser('discord_user');
  const targetName = interaction.options.getString('name');

  let query = targetName;
  let discordId = null;
  let discordTag = null;

  if (targetDiscordUser) {
    discordId = targetDiscordUser.id;
    discordTag = targetDiscordUser.tag || targetDiscordUser.username;
  } else if (!query) {
    // Eigene Daten anfordern
    discordId = interaction.user.id;
    discordTag = interaction.user.tag || interaction.user.username;
  }

  try {
    const profileData = await forumService.getProfile({
      query,
      discordId,
      discordTag,
    });

    if (!profileData || !profileData.found) {
      return await interaction.editReply({
        embeds: [
          BotEmbeds.error(
            'Profil nicht gefunden',
            query
              ? `Es konnte kein Profil für **${query}** gefunden werden.`
              : `Dein Discord-Account ist noch nicht mit dem Forum verknüpft.\nNutze \`/verify\`, um dein Konto zu verbinden!`
          ),
        ],
      });
    }

    const embed = BotEmbeds.userProfile(profileData);
    const components = [];

    if (profileData.isForumUser && profileData.user?.username) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Forenprofil im Browser')
          .setEmoji('👤')
          .setStyle(ButtonStyle.Link)
          .setURL(`${config.forum.url}/user/${encodeURIComponent(profileData.user.username)}`)
      );
      components.push(row);
    }

    await interaction.editReply({ embeds: [embed], components });
  } catch (error) {
    console.error('Error in /profile command:', error);
    await interaction.editReply({
      embeds: [BotEmbeds.error('Fehler bei der Profilabfrage', error.message)],
    });
  }
}
