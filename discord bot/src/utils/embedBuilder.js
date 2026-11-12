import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { config } from '../config.js';

export class BotEmbeds {
  /**
   * Helper: Erstellt einen sauberen ASCII-Fortschrittsbalken
   * z.B. [████████░░] 78%
   */
  static progressBar(percent, length = 10) {
    const clamped = Math.min(Math.max(percent, 0), 100);
    const filled = Math.round((clamped / 100) * length);
    const empty = length - filled;
    return `\`[${'█'.repeat(filled)}${'░'.repeat(empty)}]\` **${clamped}%**`;
  }

  /**
   * Base embed with VEGA styling
   */
  static base(title, description = '') {
    const embed = new EmbedBuilder()
      .setColor(config.brand.colorHex)
      .setTimestamp()
      .setFooter({
        text: `${config.brand.name} • FiveM & Forum Sync`,
      });

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    return embed;
  }

  /**
   * Server status embed (FiveM + Forum)
   */
  static serverStatus(fivem, forum) {
    const isFivemOnline = fivem?.online;
    const isForumOnline = forum?.online;

    const embed = new EmbedBuilder()
      .setColor(isFivemOnline ? config.brand.colorHex : 0xef4444)
      .setTitle(`⚡ ${config.brand.name} — Server & Forum Status`)
      .setDescription(
        `Hier siehst du den Live-Status des FiveM Servers und des Web-Forums in Echtzeit.`
      )
      .addFields(
        {
          name: '🎮 FiveM Gameserver',
          value: isFivemOnline
            ? `🟢 **Online**\n• Spieler: **${fivem.clients} / ${fivem.maxClients}**\n• Ping: **${fivem.ping}ms**\n• Gametype: \`${fivem.gametype}\`\n• IP: \`${fivem.ip}:${fivem.port}\``
            : `🔴 **Offline / Wartung**\n• Der Gameserver antwortet derzeit nicht.\n• IP: \`${fivem?.ip || 'Unbekannt'}\``,
          inline: true,
        },
        {
          name: '🌐 Forum & API',
          value: isForumOnline
            ? `🟢 **Online**\n• Web: [VEGA Forum](${forum.url})\n• API: Version 1.0 (Aktiv)\n• Sync: 🟢 Verbunden`
            : `🟡 **Verbindungsaufbau**\n• Forum: [Lokal / Offline](${config.brand.websiteUrl})\n• Sync: Wartet auf Verbindung`,
          inline: true,
        },
        {
          name: '🚀 Schnellverbindung (FiveM Konsole: F8)',
          value: `\`\`\`connect ${fivem?.ip || 'play.vega-crimelife.de'}:${fivem?.port || '30120'}\`\`\``,
          inline: false,
        }
      )
      .setFooter({ text: `${config.brand.name} • Live Monitor • Alle 60s synchronisiert` })
      .setTimestamp();

    return embed;
  }

  /**
   * Status Buttons Row
   */
  static statusButtons(fivemConnectUrl = config.fivem.connectUrl, forumUrl = config.forum.url) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_status_refresh')
        .setLabel('Status aktualisieren')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setLabel('FiveM Beitreten')
        .setEmoji('🎮')
        .setStyle(ButtonStyle.Link)
        .setURL(fivemConnectUrl.startsWith('fivem://') ? fivemConnectUrl : 'https://fivem.net'),
      new ButtonBuilder()
        .setLabel('Forum öffnen')
        .setEmoji('🌐')
        .setStyle(ButtonStyle.Link)
        .setURL(forumUrl)
    );
  }

  /**
   * Player statistics embed
   */
  static playerStats(player) {
    if (!player) {
      return this.error(
        'Spieler nicht gefunden',
        'Für diesen Spielernamen konnten weder in den Ranglisten noch im System Datensätze gefunden werden.'
      );
    }

    const kd = player.kdRatio !== undefined 
      ? Number(player.kdRatio).toFixed(2)
      : (player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills.toFixed(2));

    const headshotRate = player.kills > 0 
      ? Math.round((player.headshots / player.kills) * 100) 
      : 0;

    const rankDisplay = player.rank ? `#${player.rank}` : 'Unranked';

    let skillBadge = '🥉 Fighter';
    if (Number(kd) >= 3.0) skillBadge = '👑 VEGA Elite';
    else if (Number(kd) >= 2.0) skillBadge = '💎 Pro Shooter';
    else if (Number(kd) >= 1.0) skillBadge = '⚔️ Veteran';

    const embed = new EmbedBuilder()
      .setColor(config.brand.colorHex)
      .setTitle(`🎯 Spielerstatistik: ${player.playerName}`)
      .setDescription(`Offizielle Wettkampf- & Live-Daten von **${config.brand.name}**.\nEinstufung: **${skillBadge}**`)
      .addFields(
        { name: '🏆 Rang', value: `**${rankDisplay}**`, inline: true },
        { name: '⚔️ K/D Ratio', value: `**${kd}**`, inline: true },
        { name: '🏴 Fraktion', value: player.factionName ? `**${player.factionName}**` : '*Keine*', inline: true },
        { name: '🎯 Kills', value: `\`${player.kills || 0}\``, inline: true },
        { name: '💀 Tode', value: `\`${player.deaths || 0}\``, inline: true },
        { name: '💥 Headshots', value: `\`${player.headshots || 0}\`\n${this.progressBar(headshotRate, 8)}`, inline: true },
        { name: '🏅 Duelle / Siege', value: `\`${player.wins || 0}W / ${player.losses || 0}L\``, inline: true },
        { name: '⏱️ Spielzeit', value: player.playtimeMinutes ? `${Math.floor(player.playtimeMinutes / 60)}h ${player.playtimeMinutes % 60}m` : '—', inline: true }
      )
      .setFooter({ text: `${config.brand.name} • Live-Statistik` })
      .setTimestamp();

    return embed;
  }

  /**
   * Unified User Profile Embed (Forum + Discord + FiveM)
   */
  static userProfile(data) {
    if (!data || !data.found) {
      return this.error(
        'Profil nicht gefunden',
        data?.message || 'Es konnte kein zugehöriges Profil im Forum oder FiveM System gefunden werden.'
      );
    }

    if (data.statsOnly && data.player) {
      return this.playerStats(data.player);
    }

    const { user, counts, stats, recentThreads } = data;

    const embed = new EmbedBuilder()
      .setColor(config.brand.colorHex)
      .setTitle(`👤 Profil: ${user.displayName || user.username}`)
      .setDescription(
        user.bio
          ? `*„${user.bio}“*`
          : `Mitglied der **${config.brand.name}** Community.`
      );

    if (user.avatarUrl && (user.avatarUrl.startsWith('http://') || user.avatarUrl.startsWith('https://'))) {
      embed.setThumbnail(user.avatarUrl);
    }

    const roleName = user.role?.displayName || user.role?.name || 'Mitglied';
    const joinedDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('de-DE') : '—';
    const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString('de-DE') : '—';

    // Forum Information
    embed.addFields(
      {
        name: '🌐 Forum Profil',
        value: `• Benutzer: **@${user.username}**\n• Rolle: **${roleName}**\n• Registriert: \`${joinedDate}\`\n• Letzte Aktivität: \`${lastActive}\``,
        inline: true,
      },
      {
        name: '📊 Community Aktivität',
        value: `• Themen erstellt: **${counts?.threads || 0}**\n• Beiträge verfasst: **${counts?.posts || 0}**\n• Support Tickets: **${counts?.totalTickets || 0}** (${counts?.openTickets || 0} offen)`,
        inline: true,
      },
      {
        name: '🔗 Discord Status',
        value: user.discordTag ? `🟢 Verknüpft: \`${user.discordTag}\`` : `🔴 Nicht verknüpft\n*(Nutze \`/verify\` zum Verbinden)*`,
        inline: false,
      }
    );

    // FiveM Stats
    if (stats && stats.hasStats) {
      const kd = stats.kdRatio !== undefined ? stats.kdRatio.toFixed(2) : '0.00';
      const rankText = stats.rank ? `#${stats.rank}` : 'Unranked';
      const faction = stats.factionName ? `**${stats.factionName}**` : '*Keine Fraktion*';
      const hsRate = stats.headshotRate || 0;

      embed.addFields({
        name: '🎮 FiveM / In-Game Daten',
        value: `• Rang: **${rankText}** | Fraktion: ${faction}\n• Kills: **${stats.kills}** | Tode: **${stats.deaths}** | K/D: **${kd}**\n• Headshots: **${stats.headshots}** (${hsRate}%)\n• Duelle: **${stats.wins}W / ${stats.losses}L**`,
        inline: false,
      });
    }

    // Letzte Threads
    if (recentThreads && recentThreads.length > 0) {
      const threadList = recentThreads
        .map((t) => `• [${t.title}](${config.forum.url}/thread/${t.id}) (${t.repliesCount} Antworten)`)
        .join('\n');
      embed.addFields({
        name: '📝 Neueste Foren-Beiträge',
        value: threadList,
        inline: false,
      });
    }

    embed.setFooter({ text: `${config.brand.name} • Community ID: ${user.id.slice(0, 8)}` }).setTimestamp();
    return embed;
  }

  /**
   * Top 10 Leaderboard embed
   */
  static leaderboard(players) {
    const embed = new EmbedBuilder()
      .setColor(config.brand.colorHex)
      .setTitle(`🏆 ${config.brand.name} — Best Shooter & Rangliste`)
      .setDescription(
        'Die besten Schützen und Duellanten auf VEGA CrimeLife (Kills, Headshots & K/D).'
      );

    if (!players || players.length === 0) {
      embed.addFields({
        name: 'Leerzustand',
        value: 'Aktuell sind noch keine Ranglisten-Daten synchronisiert. Sobald FiveM Matches gespielt werden, erscheinen die Top 10 hier.',
      });
      return embed;
    }

    const podiumMedals = ['🥇', '🥈', '🥉'];
    let text = '';

    players.slice(0, 10).forEach((p, idx) => {
      const medal = podiumMedals[idx] || `\`#${idx + 1}\``;
      const kd = p.deaths > 0 ? (p.kills / p.deaths).toFixed(2) : p.kills.toFixed(2);
      text += `${medal} **${p.playerName}** — **${p.kills}** Kills | **${p.headshots}** HS | **${kd}** K/D\n`;
    });

    embed.addFields({
      name: 'Top 10 Schützen',
      value: text || 'Keine Einträge vorhanden',
    });

    embed.setFooter({ text: `${config.brand.name} • Wettkampf-Ranking` }).setTimestamp();
    return embed;
  }

  /**
   * Leaderboard action buttons
   */
  static leaderboardButtons(forumUrl = config.forum.url) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_leaderboard_refresh')
        .setLabel('Rangliste aktualisieren')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setLabel('Alle Ranglisten im Forum')
        .setEmoji('🏆')
        .setStyle(ButtonStyle.Link)
        .setURL(`${forumUrl}/competitions`)
    );
  }

  /**
   * Competitions & Tournaments embed
   */
  static competitions(competitions) {
    const embed = new EmbedBuilder()
      .setColor(config.brand.colorHex)
      .setTitle(`⚔️ ${config.brand.name} — Turniere & Wettbewerbe`)
      .setDescription('Hier findest du anstehende Turniere, 1v1 Duelle und Team-Wettbewerbe.');

    if (!competitions || competitions.length === 0) {
      embed.addFields({
        name: 'Aktuell keine offenen Turniere',
        value: `Erstelle eigene Duelle oder schau im [Forum Bereich Wettbewerbe](${config.forum.url}/competitions) vorbei!`,
      });
      return embed;
    }

    competitions.slice(0, 5).forEach((c) => {
      const statusMap = {
        REGISTRATION_OPEN: '🟢 Anmeldung offen',
        IN_PROGRESS: '⚔️ Läuft gerade',
        COMPLETED: '🏆 Abgeschlossen',
        DRAFT: '📝 In Planung',
      };
      const statusText = statusMap[c.status] || c.status;
      const typeText = c.type === 'DUEL_1V1' ? '1v1 Duell' : (c.type === 'TEAM_VS_TEAM' ? 'Team vs Team' : 'Turnier');
      const participants = c._count?.participants ?? 0;
      const maxPart = c.maxParticipants ? `/${c.maxParticipants}` : '';

      embed.addFields({
        name: `${c.title} (${typeText})`,
        value: `• Status: **${statusText}**\n• Teilnehmer: **${participants}${maxPart}**\n• [Im Forum ansehen](${config.forum.url}/competitions/${c.slug || c.id})`,
        inline: false,
      });
    });

    embed.setFooter({ text: `${config.brand.name} • Wettbewerbe` }).setTimestamp();
    return embed;
  }

  /**
   * Latest forum threads embed
   */
  static forumThreads(threads) {
    const embed = new EmbedBuilder()
      .setColor(config.brand.colorHex)
      .setTitle(`📰 ${config.brand.name} — Aktuelle Themen im Forum`)
      .setDescription('Die neuesten Diskussionen und Neuigkeiten direkt aus dem Forum.');

    if (!threads || threads.length === 0) {
      embed.addFields({
        name: 'Keine Themen gefunden',
        value: `Besuche das [VEGA Forum](${config.forum.url}), um den ersten Beitrag zu schreiben!`,
      });
      return embed;
    }

    threads.slice(0, 5).forEach((t) => {
      const prefix = t.prefix ? `\`${t.prefix.name}\` ` : '';
      const pin = t.isPinned ? '📌 ' : '';
      const forumName = t.forum?.name ? ` in *${t.forum.name}*` : '';
      const author = t.author?.displayName || t.author?.username || 'Unbekannt';

      embed.addFields({
        name: `${pin}${prefix}${t.title}`,
        value: `von **${author}**${forumName} • [Thema lesen](${config.forum.url}/thread/${t.id})`,
        inline: false,
      });
    });

    embed.setFooter({ text: `${config.brand.name} • Community Forum` }).setTimestamp();
    return embed;
  }

  /**
   * Online Players List Embed
   */
  static onlinePlayers(fivemStatus) {
    const embed = new EmbedBuilder()
      .setColor(fivemStatus.online ? config.brand.colorHex : 0xef4444)
      .setTitle(`🎮 ${config.brand.name} — Online Spieler`)
      .setTimestamp();

    if (!fivemStatus.online) {
      embed.setDescription(`Der FiveM Gameserver ist momentan offline oder wird neu gestartet.`);
      return embed;
    }

    embed.setDescription(
      `Aktuell sind **${fivemStatus.clients} von ${fivemStatus.maxClients}** Spielern online.\n` +
      `Modus: \`${fivemStatus.gametype}\` • Map: \`${fivemStatus.mapname}\``
    );

    if (!fivemStatus.players || fivemStatus.players.length === 0) {
      embed.addFields({
        name: 'Keine Spieler online',
        value: 'Sei der Erste, der dem Server beitritt!',
      });
    } else {
      const list = fivemStatus.players.slice(0, 25).map((p) => {
        return `\`[ID ${p.id}]\` **${p.name}** (Ping: ${p.ping || 0}ms)`;
      }).join('\n');

      embed.addFields({
        name: `Verbundene Spieler (${Math.min(fivemStatus.players.length, 25)} von ${fivemStatus.players.length})`,
        value: list,
      });
    }

    embed.setFooter({ text: `${config.brand.name} • Live Serverliste` });
    return embed;
  }

  /**
   * Ping / Latency Embed
   */
  static ping(discordPing, forumLatency, fivemLatency) {
    const embed = new EmbedBuilder()
      .setColor(config.brand.colorHex)
      .setTitle(`🏓 ${config.brand.name} — Latenz & Systemstatus`)
      .setDescription('Hier findest du die aktuellen Reaktionszeiten aller Systemkomponenten:')
      .addFields(
        {
          name: '🤖 Discord Bot Gateway',
          value: `\`${discordPing}ms\` ${discordPing < 100 ? '🟢 Exzellent' : '🟡 Gut'}`,
          inline: true,
        },
        {
          name: '🌐 Forum REST API',
          value: forumLatency !== null ? `\`${forumLatency}ms\` 🟢 Verbunden` : `\`Offline / Timeout\` 🔴`,
          inline: true,
        },
        {
          name: '🎮 FiveM Gameserver',
          value: fivemLatency !== null ? `\`${fivemLatency}ms\` 🟢 Verbunden` : `\`Offline / Timeout\` 🔴`,
          inline: true,
        }
      )
      .setFooter({ text: `${config.brand.name} • System Diagnostics` })
      .setTimestamp();

    return embed;
  }

  /**
   * Tickets Embed
   */
  static tickets(data) {
    const embed = new EmbedBuilder()
      .setColor(config.brand.colorHex)
      .setTitle(`🎫 ${config.brand.name} — Deine Support-Tickets`)
      .setTimestamp();

    if (!data || !data.found || !data.tickets || data.tickets.length === 0) {
      embed.setDescription(
        `Du hast aktuell keine offenen Support-Tickets im Forum.\n\n` +
        `Falls du Hilfe, Bugmeldungen oder Entbannungsanträge hast, erstelle jederzeit ein Ticket über das [VEGA Support Center](${config.forum.url}/support).`
      );
      return embed;
    }

    embed.setDescription(`Gefundene Tickets für **${data.user?.displayName || data.user?.username}**:`);

    data.tickets.forEach((t) => {
      const statusIcon = t.status === 'OPEN' ? '🟢' : (t.status === 'CLOSED' ? '⚪' : '🟡');
      embed.addFields({
        name: `${statusIcon} ${t.ticketNumber}: ${t.title}`,
        value: `• Kategorie: **${t.category}**\n• Status: \`${t.status}\` • Priorität: \`${t.priority}\`\n• [Im Forum öffnen](${config.forum.url}/support/ticket/${t.ticketNumber})`,
        inline: false,
      });
    });

    embed.setFooter({ text: `${config.brand.name} • Support Sync` });
    return embed;
  }

  /**
   * Help embed
   */
  static help() {
    return new EmbedBuilder()
      .setColor(config.brand.colorHex)
      .setTitle(`📖 ${config.brand.name} Discord Bot — Befehle`)
      .setDescription(
        `Der offizielle Bot für **${config.brand.name}**. Verbindet den FiveM Server, das Webforum und Discord miteinander.\n\n` +
        `Hier ist die vollständige Übersicht aller verfügbaren Slash-Commands:`
      )
      .addFields(
        {
          name: '🎮 Server & Live-Status',
          value: 
            '`/status` — Live-Status von FiveM & Forum mit Spieleranzahl & Buttons\n' +
            '`/players` — Zeigt alle aktuell online verbundenen FiveM Spieler & IDs\n' +
            '`/ping` — Überprüft die Latenz (Discord, Forum API, FiveM)',
          inline: false,
        },
        {
          name: '👤 Spieler & Ranglisten',
          value: 
            '`/profile [spieler/discord]` — Umfassendes Spieler- & Forenprofil\n' +
            '`/stats [spieler]` — Detaillierte K/D, Headshots, Duelle & Spielzeit\n' +
            '`/leaderboard` — Top 10 Best Shooter Rangliste mit Live-Aktualisierung',
          inline: false,
        },
        {
          name: '🌐 Forum & Community',
          value: 
            '`/forum` — Die neuesten Themen und Diskussionen aus dem Forum\n' +
            '`/turniere` — Aktuelle Turniere, 1v1 Duelle und Anmeldungen\n' +
            '`/verify [username]` — Verknüpft dein Discord-Konto mit dem Forum',
          inline: false,
        },
        {
          name: '🛠️ Support & Regeln',
          value: 
            '`/ticket` — Deine Support-Tickets abrufen und neues Ticket öffnen\n' +
            '`/regeln` — Das offizielle 8-Punkte Forum-Regelwerk von VEGA CrimeLife',
          inline: false,
        }
      )
      .setFooter({ text: `${config.brand.name} • Command Guide` })
      .setTimestamp();
  }

  /**
   * Help action buttons
   */
  static helpButtons(forumUrl = config.forum.url) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Forum öffnen')
        .setEmoji('🌐')
        .setStyle(ButtonStyle.Link)
        .setURL(forumUrl),
      new ButtonBuilder()
        .setLabel('Support Center')
        .setEmoji('🎫')
        .setStyle(ButtonStyle.Link)
        .setURL(`${forumUrl}/support`),
      new ButtonBuilder()
        .setLabel('Regelwerk')
        .setEmoji('📜')
        .setStyle(ButtonStyle.Link)
        .setURL(`${forumUrl}/rules`)
    );
  }

  /**
   * Rules embed
   */
  static rules() {
    return new EmbedBuilder()
      .setColor(0x111115)
      .setTitle(`📜 Forum Regelwerk | ${config.brand.name}`)
      .setDescription('Die verbindlichen Regeln für das VEGA CrimeLife Forum:')
      .addFields(
        { name: '§ 1 Respekt', value: 'Beleidigungen, Diskriminierung, Drohungen und gezielte Provokationen sind verboten. Kritik bleibt sachlich.' },
        { name: '§ 2 Themen & Beiträge', value: 'Nutze passende Kategorien und verständliche Titel. Spam, Doppelposts und absichtliches Stören von Diskussionen sind untersagt.' },
        { name: '§ 3 Verbotene Inhalte', value: 'Keine rechtswidrigen, pornografischen oder gewaltverherrlichenden Inhalte. Schadsoftware, Phishing und unerlaubte Werbung sind verboten.' },
        { name: '§ 4 Datenschutz', value: 'Veröffentliche keine privaten Daten, Nachrichten oder vertraulichen Ticketinhalte ohne Zustimmung. Sensible Beweise gehören in den Support.' },
        { name: '§ 5 Accounts & Profile', value: 'Keine Identitätstäuschung oder zusätzlichen Accounts zur Umgehung von Sperren. Namen, Avatare und Signaturen müssen regelkonform sein.' },
        { name: '§ 6 Beschwerden & Beweise', value: 'Melde Verstöße über die vorgesehenen Funktionen. Öffentliche Hetze, falsche Anschuldigungen und manipulierte Beweise sind verboten.' },
        { name: '§ 7 Wettbewerbe & Statistiken', value: 'Anmeldungen und Ergebnisse müssen wahrheitsgemäß sein. Ranglisten, Abstimmungen und Bewertungen dürfen nicht manipuliert werden.' },
        { name: '§ 8 Moderation & Konsequenzen', value: 'Verstöße können zu Verwarnungen, Inhaltslöschungen oder Sperren führen. Moderationsentscheidungen dürfen sachlich über den Support angefochten werden.' }
      )
      .setFooter({ text: `${config.brand.name} • Regelwerk` })
      .setTimestamp();
  }

  /**
   * Error embed
   */
  static error(title, description) {
    return new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle(`❌ ${title}`)
      .setDescription(description || 'Ein unerwarteter Fehler ist aufgetreten.')
      .setTimestamp();
  }
}
