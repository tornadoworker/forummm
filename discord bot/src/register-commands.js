import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function registerCommands() {
  const token = config.discord.token;
  const clientId = config.discord.clientId;
  const guildId = config.discord.guildId;

  if (!token || token === 'your_bot_token_here') {
    console.error('❌ Fehler: Bitte trage deinen DISCORD_TOKEN in die .env Datei ein!');
    process.exit(1);
  }

  if (!clientId || clientId === 'your_client_id_here') {
    console.error('❌ Fehler: Bitte trage deine CLIENT_ID in die .env Datei ein!');
    process.exit(1);
  }

  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(`file://${filePath}`);
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
      console.log(`✓ Befehl geladen: /${command.data.name}`);
    } else {
      console.warn(`[WARNUNG] Befehl in ${file} hat kein data- oder execute-Property.`);
    }
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log(`\n⏳ Registriere ${commands.length} Slash-Commands bei Discord...`);

    let data;
    if (guildId) {
      // Sofortiges Aktualisieren auf dem angegebenen Test-Guild/Server
      data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      console.log(`✅ Erfolgreich ${data.length} Befehle für Server (Guild ID: ${guildId}) registriert!`);
    } else {
      // Global (kann bis zu 1 Stunde dauern, bis Discord es auf allen Servern cacht)
      data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      console.log(`✅ Erfolgreich ${data.length} globale Slash-Commands registriert!`);
    }
  } catch (error) {
    console.error('❌ Fehler beim Registrieren der Befehle:', error);
  }
}

registerCommands();
