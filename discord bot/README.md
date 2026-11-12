# ⚡ VEGA CrimeLife — Discord Bot

Der offizielle Discord Bot für **VEGA CrimeLife**. Er verbindet den **FiveM Gameserver**, das **Web-Forum** und den **Discord-Server** miteinander in Echtzeit.

---

## 🌟 Features

- **🎮 FiveM Server Integration:**
  - `/status`: Live-Spieleranzahl, Server-Ping, Gametype und direkte FiveM-Verbindungslinks.
  - Automatische Bot-Aktivitätsanzeige: Zeigt im Bot-Status stets die aktuelle Spielerzahl (z.B. `🎮 42/128 Spieler`).
  - Fehlertolerant: Bleibt stabil und zeigt aussagekräftige Hinweise, wenn der Server neugestartet wird oder offline ist.

- **🎯 Forum & Live-Statistik Integration:**
  - `/stats [spieler]`: Fragt Spielerdaten, Kills, Tode, K/D-Ratio, Headshots und Duellstatistiken direkt über die Forum-API ab.
  - `/leaderboard`: Präsentiert die Top 10 Best Shooter Rangliste im edlen Podiums-Stil.

- **⚔️ Wettbewerbe & Turniere:**
  - `/turniere`: Übersicht über laufende Turniere, 1v1 Duelle und Team-Matches mit Direktlinks ins Forum.

- **📰 Community & Forum:**
  - `/forum`: Neueste Beiträge und aktive Diskussionen aus dem Forum.
  - `/regeln`: Das vollständige 8-Punkte Regelwerk von VEGA CrimeLife auf Abruf.
  - `/verify`: Anleitung und Kontoverknüpfung zwischen Discord-Account und Foren-Profil.
  - `/help`: Übersicht aller Befehle.

---

## 🚀 Schnelleinrichtung (Quickstart)

### 1. Bot bei Discord erstellen
1. Öffne das [Discord Developer Portal](https://discord.com/developers/applications).
2. Klicke auf **"New Application"** und vergib den Namen `VEGA CrimeLife`.
3. Gehe im linken Menü auf **"Bot"**:
   - Klicke auf **"Reset Token"** und kopiere den Token.
   - Aktiviere unter **"Privileged Gateway Intents"**:
     - *Message Content Intent* (optional)
     - *Server Members Intent* (empfohlen)
4. Gehe auf **"General Information"** und kopiere die **Application ID** (`CLIENT_ID`).
5. Lade den Bot auf deinen Discord-Server ein:
   - Gehe im Developer Portal auf **OAuth2** ➔ **URL Generator**.
   - Wähle Scopes: `bot`, `applications.commands`.
   - Wähle Berechtigungen: `Send Messages`, `Embed Links`, `Read Message History`, `Use Slash Commands`.
   - Öffne die generierte URL im Browser und wähle deinen Server aus.

### 2. Konfiguration (`.env`)
Öffne die Datei `.env` im Bot-Ordner und trage deine Zugangsdaten ein:

```env
# Discord Zugangsdaten
DISCORD_TOKEN=dein_bot_token_hier
CLIENT_ID=deine_bot_client_id_hier

# Optional: Guild-ID deines Discord-Servers (für sofortiges Laden der Slash-Befehle beim Entwickeln)
GUILD_ID=

# FiveM Server
FIVEM_IP=play.vega-crimelife.de
FIVEM_PORT=30120

# Forum API
FORUM_API_URL=http://localhost:3000
FORUM_API_KEY=
```

### 3. Befehle registrieren & Bot starten
Öffne ein Terminal im Bot-Verzeichnis:

```bash
# Abhängigkeiten installieren (bereits erledigt)
npm install

# Slash-Commands bei Discord registrieren (einmalig oder bei neuen Befehlen)
npm run deploy-commands

# Bot im Produktionsmodus starten
npm start

# ODER im Entwicklungsmodus (mit Auto-Reload bei Dateiänderungen):
npm run dev
```

---

## 📋 Verfügbare Slash-Commands

| Befehl | Beschreibung |
|---|---|
| `/status` | FiveM Server & Forum Live-Status, Ping und Spieleranzahl |
| `/stats <spieler>` | Detaillierte K/D-, Kill- und Turnierstatistiken eines Spielers |
| `/leaderboard` | Top 10 Best Shooter Rangliste |
| `/turniere` | Aktuelle Turniere und 1v1 Duelle |
| `/forum` | Aktuelle Themen aus dem Forum |
| `/regeln` | Offizielles 8-Punkte Forum Regelwerk |
| `/verify` | Discord & Forum Kontoverknüpfung |
| `/help` | Hilfe und Befehlsübersicht |

---

## 🛡️ Wartung & Architektur

- **discord.js v14**: Moderner ESM-Standard (`import`/`export`), REST API v10.
- **Isolierte Services**: 
  - `src/services/fivemService.js`: Kommunikation mit FiveM fxserver (`info.json`, `dynamic.json`, `players.json`).
  - `src/services/forumService.js`: Kommunikation mit den Next.js Forum Endpunkten (`/api/v1/stats`, `/api/v1/competitions`, `/api/threads`).
- **Sicheres Design**: Keine privaten Tokens oder IP-Leaks an Endnutzer.
