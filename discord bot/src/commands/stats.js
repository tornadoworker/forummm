import { SlashCommandBuilder } from 'discord.js';
import { forumService } from '../services/forumService.js';
import { fivemService } from '../services/fivemService.js';
import { BotEmbeds } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('Ruft die Statistiken eines Spielers oder deine eigenen ab')
  .addStringOption(option =>
    option
      .setName('spieler')
      .setDescription('Der Spielername im Forum oder auf dem FiveM Server (optional für eigene Stats)')
      .setRequired(false)
  );

export async function execute(interaction) {
  await interaction.deferReply();
  let playerName = interaction.options.getString('spieler');

  try {
    // Falls kein Spieler angegeben wurde, prüfe ob der aufrufende Discord-User verknüpft ist
    if (!playerName) {
      const check = await forumService.checkDiscordLinked(interaction.user.id);
      if (check.linked && check.user) {
        playerName = check.user.displayName || check.user.username;
      } else {
        return await interaction.editReply({
          embeds: [
            BotEmbeds.error(
              'Kein Spieler angegeben',
              `Du hast keinen Spielernamen angegeben und dein Discord-Konto ist noch nicht verknüpft.\n\n` +
              `• Nutze \`/stats spieler: <name>\` um einen beliebigen Spieler zu suchen\n` +
              `• Oder verbinde dein Konto mit \`/verify forum_benutzername: <name>\`, um deine Stats direkt abzurufen!`
            ),
          ],
        });
      }
    }

    // 1. Suche in den Forum / DB Ranglisten
    let playerStats = await forumService.getPlayerStats(playerName);

    // 2. Falls nicht in DB gefunden, prüfe ob Spieler aktuell auf FiveM online ist
    if (!playerStats) {
      const onlinePlayers = await fivemService.findOnlinePlayer(playerName);
      if (onlinePlayers.length > 0) {
        const p = onlinePlayers[0];
        playerStats = {
          playerName: p.name,
          factionName: 'Aktuell Ingame',
          kills: 0,
          deaths: 0,
          headshots: 0,
          playtimeMinutes: null,
          wins: 0,
          losses: 0,
          rank: 'Ingame (Keine Match-Daten archiviert)',
        };
      }
    }

    if (!playerStats) {
      return await interaction.editReply({
        embeds: [
          BotEmbeds.error(
            'Spieler nicht gefunden',
            `Es konnte kein Spieler mit dem Namen **${playerName}** gefunden werden. Entweder wurden noch keine Statistiken erfasst oder der Name weicht ab.`
          ),
        ],
      });
    }

    const embed = BotEmbeds.playerStats(playerStats);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in /stats command:', error);
    await interaction.editReply({
      embeds: [BotEmbeds.error('Fehler bei der Statistik-Abfrage', error.message)],
    });
  }
}
