import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { forumService } from '../services/forumService.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('search')
  .setDescription('Durchsuche das VEGA CrimeLife Forum nach Themen, Beiträgen oder Mitgliedern')
  .addStringOption(option =>
    option
      .setName('suchbegriff')
      .setDescription('Suchbegriff (z.B. Regeln, Bewerbung, Turnier)')
      .setRequired(true)
  );

export async function execute(interaction) {
  await interaction.deferReply();
  const query = interaction.options.getString('suchbegriff');

  try {
    const results = await forumService.searchForum(query);
    const threads = results?.threads || [];
    const users = results?.users || [];

    const embed = new EmbedBuilder()
      .setColor(config.brand.colorHex)
      .setTitle(`🔍 Suchergebnisse für: "${query}"`)
      .setTimestamp()
      .setFooter({ text: `${config.brand.name} • Forum-Suche` });

    if (threads.length === 0 && users.length === 0) {
      embed.setDescription(`Es wurden keine Treffer im Forum für **${query}** gefunden.`);
    } else {
      let description = '';

      if (threads.length > 0) {
        description += `### 📄 Themen (${threads.length})\n`;
        threads.slice(0, 5).forEach(t => {
          const author = t.author?.displayName || t.author?.username || 'Unbekannt';
          description += `• [**${t.title}**](${config.forum.url}/thread/${t.id}) von *${author}*\n`;
        });
        description += '\n';
      }

      if (users.length > 0) {
        description += `### 👤 Mitglieder (${users.length})\n`;
        users.slice(0, 4).forEach(u => {
          const role = u.role?.displayName || 'Mitglied';
          description += `• [**${u.displayName || u.username}**](${config.forum.url}/user/${u.username}) (\`@${u.username}\` • ${role})\n`;
        });
      }

      embed.setDescription(description);
    }

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Erweiterte Suche im Web')
        .setEmoji('🌐')
        .setStyle(ButtonStyle.Link)
        .setURL(`${config.forum.url}/search?q=${encodeURIComponent(query)}`)
    );

    await interaction.editReply({ embeds: [embed], components: [buttons] });
  } catch (error) {
    console.error('Error in /search command:', error);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle('❌ Fehler bei der Forum-Suche')
          .setDescription(error.message)
      ]
    });
  }
}
