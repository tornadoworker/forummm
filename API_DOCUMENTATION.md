# VEGA CrimeLife API & Integrations-Dokumentation (v1)

Dieses Dokument beschreibt die vorbereitete Integrationsarchitektur zwischen dem **VEGA CrimeLife Forum**, dem **FiveM Server** und dem **Discord Bot**.

---

## 1. Übersicht & Sicherheitsmodell

### Status der Integrationsschnittstellen
- **Standardzustand**: Die schreibenden Integrationsendpunkte sind standardmäßig deaktiviert und liefern `403 Forbidden` mit dem standardisierten Fehlercode:
  ```json
  {
    "error": "Die externe Integration ist serverseitig noch nicht aktiviert.",
    "code": "INTEGRATION_NOT_CONFIGURED"
  }
  ```
- **Sicherheitsgarantie**:
  - Keine Geheimnisse (`API-Keys`, `Tokens`) im Browser oder in Client-Skripten.
  - Serverseitige SHA-256 HMAC Authentifizierung für schreibende Aufrufe.
  - Idempotente Event-Verarbeitung via eindeutiger `eventId` gegen Duplizierung von Kills und Match-Ergebnissen.
  - Öffentliche JSON-Endpunkte (z. B. für Ingame NUI HUD) filtern interne Spielerkennungen und private Kontodaten heraus.

---

## 2. Vorbereitete Endpunkte

### 2.1 Live-Statistiken

#### `GET /api/v1/stats` (Öffentliche Rangliste & Ingame NUI)
Gibt die verifizierten Ranglisten, Top-Shooter und Fraktionswertungen aus.
- **Header**:
  - `Accept: application/json`
- **Query-Parameter**:
  - `ingame=true` (optional): Liefert kompakte Daten für FiveM NUI HUDs.
  - `limit=20` (optional): Maximale Anzahl an Schützen.
- **Antwort bei deaktivierter Integration / ohne Daten (`200 OK`)**:
  ```json
  {
    "connected": false,
    "status": "NOT_CONNECTED",
    "message": "Noch keine Datenquelle verbunden",
    "lastUpdated": null,
    "rankings": [],
    "topShooter": null,
    "factions": []
  }
  ```

#### `POST /api/v1/stats` (FiveM Server Stat-Event Sender)
Nimmt autorisierte Kill-, Headshot- und Spielzeit-Events vom FiveM Server entgegen.
- **Header**:
  - `Content-Type: application/json`
  - `x-api-key: <DEIN_SHA256_FIVEM_KEY>`
  - `x-source-server: play.vega-crimelife.de`
- **Payload-Vertrag**:
  ```json
  {
    "eventId": "evt_fivem_20261110_98231",
    "timestamp": 1794342000,
    "sourceServer": "play.vega-crimelife.de",
    "eventType": "KILL",
    "killer": {
      "stablePlayerId": "license:4a123f8b09c91d8e",
      "playerName": "Tornado_Sniper",
      "factionName": "East Side Ballas",
      "isHeadshot": true
    },
    "victim": {
      "stablePlayerId": "license:7b9821c0029a7f31",
      "playerName": "Vega_Demon",
      "factionName": "Bloods"
    }
  }
  ```
- **Antworten**:
  - `200 OK`: `{"success": true, "eventId": "...", "processed": true}`
  - `200 OK (Duplikat)`: `{"success": true, "eventId": "...", "duplicate": true}`
  - `403 Forbidden`: `{"error": "...", "code": "INTEGRATION_NOT_CONFIGURED"}`

---

### 2.2 Wettbewerbe & Duelle

#### `GET /api/v1/competitions` (Turniere & Match-Übersicht)
Gibt öffentliche Turniere, Brackets und Match-Paarungen aus.
- **Query-Parameter**:
  - `type=1V1` oder `type=TEAM`
  - `status=REGISTRATION_OPEN` oder `status=IN_PROGRESS`
- **Beispiel-Antwort (`200 OK`)**:
  ```json
  {
    "competitions": [
      {
        "id": "cm19f8...",
        "title": "Vega Spring Shootout 2026",
        "type": "1V1",
        "status": "REGISTRATION_OPEN",
        "maxParticipants": 16,
        "participantCount": 6
      }
    ]
  }
  ```

#### `POST /api/v1/competitions` (Ergebnis-Übermittlung vom Gameserver)
Übermittelt das bestätigte Endergebnis eines Turnierspiels oder 1v1 Duells.
- **Header**:
  - `Content-Type: application/json`
  - `x-api-key: <DEIN_SHA256_FIVEM_KEY>`
- **Payload-Vertrag**:
  ```json
  {
    "matchId": "cm19f8...",
    "winnerPlayerId": "license:4a123f8b09c91d8e",
    "score1": 5,
    "score2": 2,
    "notes": "Best of 5 Pistol Duel - Reguläres Rundenende"
  }
  ```

---

## 3. FiveM Lua Integration Snippet (Vorlage für Gameserver)

Füge folgendes serverseitiges Script in deine FiveM Resource ein, sobald die Integration im ACP aktiviert wurde:

```lua
-- server/forum_sync.lua
local API_URL = "http://localhost:3000/api/v1/stats"
local API_KEY = "vega_fivem_dein_geheimer_schluessel"

RegisterNetEvent("vega:onPlayerKilled")
AddEventHandler("vega:onPlayerKilled", function(killerId, victimId, isHeadshot)
    local killerLicense = GetPlayerIdentifierByType(killerId, 'license')
    local victimLicense = GetPlayerIdentifierByType(victimId, 'license')

    local payload = json.encode({
        eventId = "evt_" .. os.time() .. "_" .. math.random(1000, 9999),
        timestamp = os.time(),
        sourceServer = "play.vega-crimelife.de",
        eventType = "KILL",
        killer = {
            stablePlayerId = killerLicense,
            playerName = GetPlayerName(killerId),
            factionName = Player(killerId).state.faction or "Zivilist",
            isHeadshot = isHeadshot or false
        },
        victim = {
            stablePlayerId = victimLicense,
            playerName = GetPlayerName(victimId),
            factionName = Player(victimId).state.faction or "Zivilist"
        }
    })

    PerformHttpRequest(API_URL, function(err, text, headers)
        if err == 200 then
            print("[VEGA FORUM] Stat-Event erfolgreich uebermittelt.")
        else
            print("[VEGA FORUM] Sync-Status: " .. tostring(err) .. " (Integration nicht konfiguriert oder deaktiviert)")
        end
    end, 'POST', payload, {
        ["Content-Type"] = "application/json",
        ["x-api-key"] = API_KEY,
        ["x-source-server"] = "play.vega-crimelife.de"
    })
end)
```

---

## 4. Funktionsmatrix: Lokal Verfügbar vs. Spätere API-Anbindung

| Funktion | Lokal im Forum sofort nutzbar | Benötigt spätere FiveM / Discord API |
| :--- | :---: | :---: |
| **Kategorien & Archivierung** | ✅ Vollständig aktiv | – |
| **Live Statistik Ansicht (`/stats`)** | ✅ Vollständig aktiv | – |
| **Entwicklermodus (Demo-Daten)** | ✅ Vollständig aktiv | – |
| **Echte Kill- & K/D-Synchronisation** | – | 🔌 FiveM POST `/api/v1/stats` |
| **1v1 Duell Herausforderungen** | ✅ Vollständig aktiv | – |
| **Herausforderungen annehmen/ablehnen** | ✅ Vollständig aktiv | – |
| **Turniere anlegen & beitreten** | ✅ Vollständig aktiv | – |
| **Turnierbaum & Spielplan Ansicht** | ✅ Vollständig aktiv | – |
| **Automatische Duell-Ergebnisse** | – | 🔌 FiveM POST `/api/v1/competitions` |
| **Automatische Discord-Pings** | – | 🔌 Discord Bot Webhook |
| **ACP Wettbewerbsverwaltung** | ✅ Vollständig aktiv | – |
| **ACP Integrationsstatus & API-Keys** | ✅ Vollständig aktiv | – |
