import { Client, GatewayIntentBits, Collection, Events, ActivityType, MessageFlags } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { fivemService } from './services/fivemService.js';
import { forumService } from './services/forumService.js';
import { BotEmbeds } from './utils/embedBuilder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Initialisiere Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

client.commands = new Collection();

// 2. Befehle dynamisch laden
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = await import(`file://${filePath}`);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`[WARNUNG] Befehl in ${file} fehlt "data" oder "execute".`);
  }
}

// 3. Status Updater Funktion (Live FiveM Spieleranzeige im Bot-Status)
async function updateBotPresence() {
  try {
    const status = await fivemService.getServerStatus();
    if (status.online) {
      client.user.setPresence({
        activities: [
          {
            name: `${status.clients}/${status.maxClients} Spieler | /help`,
            type: ActivityType.Watching,
          },
        ],
        status: 'online',
      });
    } else {
      client.user.setPresence({
        activities: [
          {
            name: `Wartung / Offline | /help`,
            type: ActivityType.Custom,
          },
        ],
        status: 'idle',
      });
    }
  } catch (err) {
    console.error('Fehler beim Aktualisieren der Bot-Presence:', err.message);
  }
}

// 4. Ready Event
client.once(Events.ClientReady, (c) => {
  console.log(`\n======================================================`);
  console.log(`🚀 ${config.brand.name} Discord Bot ist ONLINE!`);
  console.log(`👤 Eingeloggt als: ${c.user.tag}`);
  console.log(`📁 Befehle geladen: ${client.commands.size}`);
  console.log(`🎮 FiveM Ziel: ${config.fivem.ip}:${config.fivem.port}`);
  console.log(`🌐 Forum API: ${config.forum.url}`);
  console.log(`======================================================\n`);

  // Sofortige erste Statusaktualisierung
  updateBotPresence();

  // Alle 60 Sekunden aktualisieren
  setInterval(updateBotPresence, 60000);
});

// 5. Interaction Handler (Slash Commands & Interaktive Buttons)
client.on(Events.InteractionCreate, async (interaction) => {
  // A. Button Interactions
  if (interaction.isButton()) {
    try {
      if (interaction.customId === 'btn_status_refresh') {
        await interaction.deferUpdate();
        const [fivemStatus, forumStatus] = await Promise.all([
          fivemService.getServerStatus(),
          forumService.checkHealth(),
        ]);
        const embed = BotEmbeds.serverStatus(fivemStatus, forumStatus);
        const buttons = BotEmbeds.statusButtons(fivemStatus?.connectUrl, forumStatus?.url);
        await interaction.editReply({ embeds: [embed], components: [buttons] });
        return;
      }

      if (interaction.customId === 'btn_leaderboard_refresh') {
        await interaction.deferUpdate();
        const players = await forumService.getRankings(10);
        const embed = BotEmbeds.leaderboard(players);
        const buttons = BotEmbeds.leaderboardButtons();
        await interaction.editReply({ embeds: [embed], components: [buttons] });
        return;
      }
    } catch (btnError) {
      console.error('Fehler bei Button Interaction:', btnError);
    }
    return;
  }

  // B. Chat Slash Commands
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`Kein Befehl passend zu ${interaction.commandName} gefunden.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Fehler bei Ausführung von /${interaction.commandName}:`, error);
    const errorEmbed = BotEmbeds.error(
      'Befehlsfehler',
      'Beim Ausführen dieses Befehls ist ein interner Fehler aufgetreten.'
    );

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
  }
});

// 6. Start / Validierung
const token = config.discord.token;

if (!token || token === 'your_bot_token_here') {
  console.log(`\n======================================================`);
  console.log(`⚠️  HINWEIS: DISCORD BOT SETUP`);
  console.log(`======================================================`);
  console.log(`Der Bot ist vollständig programmiert und einsatzbereit.`);
  console.log(`Um den Bot zu starten, trage bitte deinen Discord Bot Token`);
  console.log(`in die Datei ".env" ein:`);
  console.log(`DISCORD_TOKEN=dein_token`);
  console.log(`CLIENT_ID=deine_bot_client_id\n`);
  console.log(`Starte danach den Bot mit:`);
  console.log(`  npm run deploy-commands  (einmalig)`);
  console.log(`  npm start`);
  console.log(`======================================================\n`);
  process.exit(0);
}

client.login(token);
