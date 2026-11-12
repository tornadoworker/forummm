# VEGA CRIMELIFE – COMMUNITY FORUM & PLATFORM

> **Produktionsfähiges Community Forum & Support-Ticketsystem für Vega Crimelife (GTA V FiveM Gaming Netzwerk)**  
> Entwickelt mit modernster Fullstack-Architektur: **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, **JWT Session Authentifizierung** und **RBAC**.

---

## 🎮 1. Design & Branding

Die Benutzeroberfläche folgt einer eigenständigen, hochprofessionellen **Dark Gaming Designsprache**, maßgeschneidert auf GTA V FiveM Ästhetik:

| Token | Farbwert (HEX) | Verwendung |
|---|---|---|
| **Hauptbackground** | `#080B12` | Gesamter Viewport & Header-Top-Bar |
| **Sekundärer Hintergrund** | `#101624` | Sidebar-Elemente, Subpanels, Menüs |
| **Karten & Panels** | `#151D2D` | Forencontainer, Beitragsboxen, Threads |
| **Primärer Akzent** | `#4C8DFF` | Primary Buttons, Links, Supporter-Badges |
| **Sekundärer Akzent** | `#965CFF` | Highlights, Ankündigungs-Badges |
| **Haupttext** | `#F3F6FC` | Primäre Überschriften und Inhalte |
| **Sekundärtext** | `#94A3B8` | Metadaten, Timestamps, Untertitel |
| **Rahmen & Border** | `#263247` | Klare, dezente Begrenzungen |

---

## 🚀 2. Enthaltene Features & Module

### 🏛️ Forensystem (XenForo Level)
- **Kategorien & Unterforen:** Strukturierte Foren (Vega Crimelife, Community, FiveM, Support, Bewerbungen).
- **Themen & Beiträge:** Rich-Text/Markdown-Beiträge mit Formatierungen, Zitierfunktion (`> Zitat`) und Erwähnungen.
- **Interaktive Umfragen:** Erstellung von Single-Choice Umfragen mit Live-Balkendiagrammen und Stimmabgabe.
- **Reaktionen:** Post-Reaktionen (👍 Gefällt mir, 🔥 Fire, ❤️ Heart) mit Zähler und Autorenerkennung.
- **Themenpräfixe:** Voll dynamische Präfixe (*Wichtig*, *Ankündigung*, *Support*, *Vorschlag*, *In Prüfung*, *Angenommen*, *Abgelehnt*, *Erledigt*).
- **Moderationswerkzeuge:** Berechtigte Moderatoren/Admins können Themen pinnen, schließen, verschieben oder löschen.
- **Lesezeichen (Bookmarks):** Themen speichern und im persönlichen Menü schnell abrufen.
- **Gelesen / Ungelesen & Zähler:** Foren- und Themenstatistiken (Klicks, Antworten, letzter Beitrag).

### 🎫 Support & Ticketsystem
- **Kategorien:** Allgemeiner Support, Technischer Support, Spieler melden, Teammitglied melden, Entbannungsantrag, etc.
- **Dynamische Pflichtfelder:** Automatische Einblendung von Feldern für *"Betroffener Spieler / ID"* und *"Beweismaterial / Clip-URL"* je nach Ticketkategorie.
- **Team-Steuerung:** Tickets übernehmen, Teammitgliedern zuweisen, Priorität (Niedrig, Normal, Hoch, Dringend) setzen und Status ändern.
- **Interne Teamnotizen:** Echte, streng serverseitig geschützte Notizen (`isInternalNote: true`), die **ausschließlich** für das Team sichtbar sind.
- **Audit-Log:** Vollständige Historie aller Statuswechsel und Zuweisungen direkt im Ticket.

### 🛡️ Rollen & RBAC Berechtigungssystem
Rechte werden serverseitig in allen API-Routen und Komponenten geprüft:
1. **Projektleitung (Prio 100):** Voller Systemzugriff, ACP, Rollen-, Foren- und Ticketverwaltung.
2. **Administrator (Prio 80):** Vollzugriff auf Verwaltung, Moderation und Support.
3. **Moderator (Prio 60):** Forenmoderation (Pinnen, Schließen, Löschen, Bannen).
4. **Supporter (Prio 40):** Support-Tickets bearbeiten, interne Notizen lesen/schreiben.
5. **VIP (Prio 20):** Foreninteraktion, VIP-Status im Profil.
6. **Mitglied (Prio 10):** Standard-Rechte (Themen & Antworten erstellen, Reaktionen).
7. **Gast (Prio 0):** Nur Lesezugriff.

### 👥 Benutzerprofile & Community
- **Profilseiten:** Individuelle Banner, Avatare, Biografie, Registrierungsdatum, FiveM Lizenz-ID und Discord Tag.
- **Profil-Pinnwand:** Andere Mitglieder können Nachrichten direkt auf dem Profil hinterlassen.
- **Mitgliederliste (`/members`):** Durchsuchbar nach Name und gefiltert nach Aktivität.
- **Teamseite (`/team`):** Nach Rangordnung hierarchisch gegliedert.

### 💬 Private Nachrichten (DMs)
- Vertrauliche Unterhaltungen zwischen 2 oder mehreren Spielern.
- Live-Nachrichtenverlauf mit ungelesenen Nachrichten-Zählern in der Navigationsleiste.

### 🔔 Benachrichtigungssystem
- Benachrichtigungen bei Antworten auf eigene Themen, Erwähnungen, Reaktionen, DMs und Ticket-Updates.
- Unread-Counter in der Top-Navigation und "Alle als gelesen markieren"-Funktion.

### 🕹️ FiveM Server-Integration
- Live-Status-Widget auf der Startseite und im Header.
- Spielerzahlen (z.B. 184/256 online), Verbindungsstatus und One-Click FiveM Direktverbindungs-Button (`fivem://connect/...`).

### 📚 Wiki & Regelwerk (`/wiki` & `/rules`)
- Vollständiges Server-Regelwerk (§ 1 Grundregeln, VDM/RDM, Power-RP, Fraktionsregeln).
- Kategorisierte Wissensdatenbank mit Inhaltsverzeichnis und Klickzählern.

### ⚙️ Admin Control Panel (ACP) (`/admin`)
- **Dashboard:** Live-Metriken zu Benutzern, Themen, Beiträgen und offenen Support-Fällen.
- **Benutzerverwaltung:** Rollen zuweisen, Benutzer sperren (Bann mit Grund), Profile verwalten.
- **Forenverwaltung:** Neue Foren und Unterforen per Klick anlegen.
- **Präfixverwaltung:** Neue Präfixe mit Farbcodes anlegen.
- **Sicherheits-Audit-Logs:** Chronologisches Protokoll aller administrativen Aktionen.

---

## 🔑 3. Standard-Zugangsdaten (Seed Accounts)

Alle Accounts sind mit dem Passwort **`admin1234!`** vorkonfiguriert:

| Benutzername | Rolle | E-Mail | Zweck |
|---|---|---|---|
| **CrimeLifeAdmin** | **Projektleitung** | `admin@vega-crimelife.de` | ACP Vollzugriff & Systemverwaltung |
| **Mod_Sarah** | **Moderator** | `mod@vega-crimelife.de` | Forenmoderation & Bans |
| **Support_Dave** | **Supporter** | `support@vega-crimelife.de` | Ticketsystem & interne Notizen |
| **GTA_Veteran** | **Mitglied / RP-Boss** | `member@vega-crimelife.de` | Normaler Spieler & Fraktionsleiter |

> Ein Klick auf die Demo-Buttons auf der Login-Seite füllt die Anmeldedaten automatisch aus!

---

## 🛠️ 4. Installation & Start

### Lokaler Entwicklungsmodus (Node.js)

1. Node.js 24 verwenden und Abhängigkeiten installieren.
   ```bash
   npm ci
   ```

2. `.env.example` nach `.env` kopieren und `DATABASE_URL` sowie `DIRECT_URL` für die lokale PostgreSQL-Datenbank setzen. Die Migration anwenden.
   ```bash
   npm run db:migrate
   ```
   `npm run db:setup` lädt zusätzlich Demodaten in eine lokale Entwicklungsdatenbank.

3. **Entwicklungsserver starten:**
   ```bash
   npm run dev
   ```
   Öffne danach [http://localhost:3000](http://localhost:3000) im Browser.

---

### Produktions-Build

```bash
npm run build
npm start
```

### Render Free

[`render.yaml`](render.yaml) konfiguriert den Webservice in Frankfurt. Der Build installiert die gesperrten Abhängigkeiten, baut Next.js und wendet die Prisma-Migrationen an. Der Start übernimmt den von Render gesetzten Port.

1. In [Neon](https://console.neon.tech/) ein Free-Projekt in Frankfurt verwenden. Die gepoolte Verbindung als `DATABASE_URL` und die direkte Verbindung als `DIRECT_URL` setzen. Für den einmaligen Import lokal mit diesen Variablen zuerst `npm run db:migrate`, dann `npm run db:import-sqlite -- prisma/dev.db` ausführen. Der Import erwartet eine leere Ziel-Datenbank und übernimmt vorhandene Beiträge, Konten und Uploads. Das bekannte Demo-Passwort wird beim Import deaktiviert.
2. `main` in Render als [Blueprint](https://render.com/docs/infrastructure-as-code) verbinden. Die beiden Datenbank-URLs sowie `DISCORD_CLIENT_ID` und `DISCORD_CLIENT_SECRET` im Render-Dashboard hinterlegen. Der Blueprint generiert `JWT_SECRET` und `CAPTCHA_SECRET`.
3. Die DNS-Einträge für `vegacrimelife.de` nach Render-Vorgaben setzen und das TLS-Zertifikat im Dashboard prüfen. [Render DNS](https://render.com/docs/configure-other-dns)
4. In Discord unter **OAuth2 → Redirects** exakt `https://vegacrimelife.de/api/auth/discord/callback` eintragen. Danach Login, neues Thema, Antwort, Bild-Upload und Discord-Anmeldung über die Domain prüfen.

Bilder aus dem Forum teilen sich den Speicherplatz des Neon-Free-Projekts mit den übrigen Daten. Render und Neon können bei Inaktivität pausieren. [Render Free](https://render.com/docs/free) · [Neon Free](https://neon.com/docs/introduction/plans)

---

### Docker Deployment (Produktion)

```bash
docker compose up -d --build
```
Das Forum ist anschließend sofort unter Port `3000` erreichbar.

---

## 🔒 5. Sicherheit & Datenschutz

- **Passwortsicherheit:** Hashing mit `bcryptjs` (Salt-Rounds: 10).
- **Session-Verwaltung:** Stateless JWT Tokens signiert mit `jose` (HS256) in gesicherten `HttpOnly`, `SameSite=Lax` Cookies.
- **SQL-Injection-Schutz:** Garantiert durch parametrisierte Prisma ORM Abfragen.
- **XSS-Schutz:** Standard-Sanitization in React 19 / Next.js.
- **RBAC Server-Autorisierung:** Kein Client kann durch Manipulation von Formularen Admin- oder Supporter-Rechte umgehen.
