import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { forumService } from '../services/forumService.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('verify')
  .setDescription('Verbinde dein Discord-Konto direkt mit deinem Profil im VEGA Forum')
  .addStringOption(option =>
    option
      .setName('forum_benutzername')
      .setDescription('Dein Benutzername oder Anzeigename im Forum (z.B. Luckydjamil)')
      .setRequired(false)
  );

export async function execute(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const inputName = interaction.options.getString('forum_benutzername');
  const discordUser = interaction.user;

  try {
    // 1. Wenn kein Name angegeben wurde: Status prüfen
    if (!inputName) {
      const check = await forumService.checkDiscordLinked(discordUser.id);
      if (check.linked && check.user) {
        const embed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle('✅ Discord-Konto bereits verknüpft')
          .setDescription(`Dein Discord-Account ist bereits erfolgreich mit dem VEGA Forum verbunden!`)
          .addFields(
            { name: 'Forum Benutzer', value: `**${check.user.displayName || check.user.username}** (\`@${check.user.username}\`)`, inline: true },
            { name: 'Rang', value: `**${check.user.role}**`, inline: true },
            { name: 'Discord ID', value: `\`${discordUser.id}\``, inline: true }
          )
          .setFooter({ text: `${config.brand.name} • Verknüpfungsstatus` })
          .setTimestamp();

        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('Forenprofil öffnen')
            .setEmoji('👤')
            .setStyle(ButtonStyle.Link)
            .setURL(`${config.forum.url}/user/${encodeURIComponent(check.user.username)}`)
        );

        return await interaction.editReply({ embeds: [embed], components: [buttons] });
      }

      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle('🔗 Noch kein Foren-Konto verknüpft')
        .setDescription(
          `Dein Discord-Account (**${discordUser.tag || discordUser.username}**) ist derzeit noch nicht mit deinem Profil im VEGA CrimeLife Forum verbunden.\n\n` +
          `**So verknüpfst du dein Konto sofort:**\n` +
          `Tippe einfach:\n` +
          `\`\`\`/verify forum_benutzername: DeinName\`\`\`\n` +
          `*Beispiel: \`/verify forum_benutzername: Luckydjamil\`*`
        )
        .setFooter({ text: `${config.brand.name} • Account Verknüpfung` })
        .setTimestamp();

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Jetzt im Forum registrieren')
          .setEmoji('🌐')
          .setStyle(ButtonStyle.Link)
          .setURL(`${config.forum.url}/register`)
      );

      return await interaction.editReply({ embeds: [embed], components: [buttons] });
    }

    // 2. Name wurde angegeben: Direkt verknüpfen!
    const result = await forumService.linkDiscordAccount(
      inputName,
      discordUser.id,
      discordUser.tag || discordUser.username
    );

    if (!result) {
      return await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle('❌ Forum API nicht erreichbar')
            .setDescription(`Das Forum konnte unter \`${config.forum.url}\` nicht erreicht werden. Stelle sicher, dass der Webserver läuft.`)
            .setTimestamp()
        ]
      });
    }

    if (!result.success || result.error) {
      return await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle('❌ Verknüpfung fehlgeschlagen')
            .setDescription(
              result.message ||
              `Es wurde kein Konto mit dem Namen **${inputName}** im Forum gefunden. Bitte registriere dich zuerst auf ${config.brand.websiteUrl} oder prüfe die Schreibweise!`
            )
            .setTimestamp()
        ]
      });
    }

    // 3. Erfolgreich verknüpft!
    const user = result.user;
    const successEmbed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle('🎉 Erfolgreich verknüpft!')
      .setDescription(
        `Dein Discord-Account **${discordUser.tag || discordUser.username}** wurde erfolgreich mit dem VEGA Forum verbunden!`
      )
      .addFields(
        { name: 'Forum Benutzer', value: `**${user.displayName || user.username}**`, inline: true },
        { name: 'Benutzername', value: `\`@${user.username}\``, inline: true },
        { name: 'Rolle im Forum', value: `**${user.role}**`, inline: true },
        { name: 'Discord ID', value: `\`${discordUser.id}\``, inline: true }
      )
      .setFooter({ text: `${config.brand.name} • Account Sync Aktiv` })
      .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Zum Profil im Forum')
        .setEmoji('👤')
        .setStyle(ButtonStyle.Link)
        .setURL(`${config.forum.url}/user/${encodeURIComponent(user.username)}`)
    );

    await interaction.editReply({ embeds: [successEmbed], components: [buttons] });
  } catch (error) {
    console.error('Error in /verify command:', error);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle('❌ Fehler bei der Verknüpfung')
          .setDescription(`Ein interner Fehler ist aufgetreten: ${error.message}`)
          .setTimestamp()
      ]
    });
  }
}
