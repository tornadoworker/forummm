# VEGA CrimeLife Forum – Interner Sicherheits- und Härtungsbericht

**Datum:** 10. November 2026  
**Status:** Erfolgreich durchgeführt & verifiziert  
**Prüfumfang:** Vollständige Überprüfung und Härtung aller 8 Sicherheitsbereiche (Berechtigungen & IDOR, Authentifizierung & Sitzungen, Eingaben & Browser, Uploads & Dateien, APIs & Schnittstellen, Datenbank & Secrets, Admin-Schutz & Audit-Logs, Automatisierte Nachweise).

---

## 1. Executive Summary

Im Rahmen des internen Sicherheitsaudits wurden Architektur, Authentifizierung, Datenbankzugriffe, API-Routen, Dateiuploads, Drittanbieter-Schnittstellen (FiveM, Discord Bot) und Header-Konfigurationen des VEGA CrimeLife Forums tiefgreifend analysiert und gehärtet.

### Wesentliche behobene Schwachstellen:
1. **Unvollständige Sitzungsinvalidierung (Session Revocation):** Bisherige JWTs wurden bei Bann, Rollenänderung oder Passwortwechsel nicht sofort ungültig.
   - **Behebung:** Einführung von `sessionVersion` im `User`-Modell und in den JWT-Claims. Bei Kontosperre, Passwort-Reset, Rollenänderung oder manueller Sitzungsbeendigung (`REVOKE_SESSIONS`) wird die Version atomar inkrementiert, wodurch alle älteren Tokens sofort abgewiesen und die Cookies gelöscht werden.
2. **Replay-Gefahr bei Passwort-Resets:** Reset-Tokens besaßen keinen atomaren Einmal-Schutz in der Datenbank.
   - **Behebung:** Einführung des `PasswordResetToken`-Modells mit SHA-256-Hashing (kein Klartext-Token in der Datenbank), 15-minütiger Lebensdauer und atomarer Einmal-Entwertung (`usedAt`).
3. **MIME-Type Spoofing & Fehlende Magic Bytes bei Uploads:** Bisher wurden nur client-übermittelte MIME-Strings geprüft.
   - **Behebung:** Implementierung von `fileSecurity.ts` mit Magic-Bytes-Inspektion (JPEG, PNG, WebP, GIF), vollständigem Verbot von SVG (Stored-XSS-Prävention) und serverseitiger Pfadtraversal-Absicherung (`assertSafePath`).
4. **Fehlende Authentifizierung an der Verifizierungs-Schnittstelle:** `/api/v1/verify` POST erlaubte unautorisierte Account-Verknüpfungen.
   - **Behebung:** Strenger Schutz über den API-Schlüssel der Bot-Integration (`authenticateIntegrationKey`) bzw. Identitätsprüfung des aktuell angemeldeten Benutzers.
5. **SSRF-Risiken bei Server-Abfragen:**
   - **Behebung:** `src/lib/ssrf.ts` blockiert zuverlässig alle privaten IP-Bereiche (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, ::1) sowie Cloud-Metadatendienste (169.254.169.254, AWS/GCP/Azure).
6. **Fehlende Sicherheitsheader & CSRF-Schwachstellen:**
   - **Behebung:** Umfassende CSP, Clickjacking-Schutz (`X-Frame-Options: DENY`), `X-Content-Type-Options: nosniff`, `Permissions-Policy`, HSTS und globaler CSRF-Schutz in `src/middleware.ts` und `next.config.mjs`.

---

## 2. Detaillierte Prüfung nach den 8 Sicherheitsbereichen

### Bereich 1: Berechtigungen und Datenzugriff
- **IDOR-Schutz:** Strengste Objektprüfung auf Ticket- und Nachrichtenebene. Normale Nutzer können ausschließlich eigene Tickets und Nachrichten einsehen.
- **Interne Notizen:** In Support-Tickets werden interne Teamnotizen (`isInternalNote: true`) für normale Anwender serverseitig herausgefiltert.
- **Interne Protokolle:** Interne Ticket-Audit-Logs und Supporter-Listen werden normalen Nutzern nicht mehr ausgeliefert.
- **Pinnwand- & Privatsphäre:** Beim Erstellen von Pinnwand-Einträgen wird `targetUser.allowProfilePosts` und `user.isMuted` serverseitig validiert.

### Bereich 2: Anmeldung, Passwörter und Sitzungen
- **Passwort-Hashing:** Modernes adaptives Bcrypt-Verfahren mit Work-Factor 12.
- **Timing-Attacken:** Beim Login wird bei nicht-existentem Benutzer ein konstanter Bcrypt-Dummy-Vergleich ausgeführt, um User-Enumeration via Timing zu verhindern.
- **Sitzungskennungen & Cookies:** `HttpOnly: true`, `SameSite: 'lax'`, `Secure: process.env.NODE_ENV === 'production'`.
- **Sitzungs-Widerruf:** Automatische Entwertung aller Tokens bei Passwortwechsel, Rollenänderung oder Kontosperre.
- **Step-Up Re-Authentifizierung:** Vor sensiblen Aktionen wird geprüft, ob eine kürzliche Bestätigung vorliegt.

### Bereich 3: Eingaben, Browser und Angriffsflächen
- **XSS & Output Encoding:** `PostRenderer.tsx` normalisiert Links und Bilder strikt gegen `javascript:`, `data:`, `vbscript:` und protocol-relative URLs (`//`).
- **CSRF-Schutz:** `src/middleware.ts` prüft bei allen zustandsändernden HTTP-Methoden (POST, PUT, PATCH, DELETE) die Anfrageherkunft (`Origin` / `Referer`).
- **Open Redirect:** Weiterleitungsparameter (`?redirect=...`) werden validiert. Nur relative Pfade (`/`) ohne Protokoll-Präfixe sind zulässig.
- **SSRF:** Vollständige Filterung privater Netze und Cloud-Metadatendienste vor ausgehenden Server-Requests.

### Bereich 4: Uploads und private Dateien
- **Magic Bytes Inspektion:** Überprüfung der echten Dateisignaturen im Header der Datei (JPEG, PNG, WebP, GIF).
- **Gefährliche Formate:** Striktes Verbot von SVG, HTML, PHP, Scripts und Executables.
- **Pfadtraversal:** Eindeutige, kryptografisch zufällige Dateinamen (`uuid`/`hex`), kombiniert mit `assertSafePath`.
- **Private Anhänge:** Endpunkt `GET /api/attachments/[key]` streamt private Support-Dateien außerhalb des Webroots mit strikten Headern (`Content-Disposition: attachment`, `no-store`, restriktive CSP).

### Bereich 5: Schnittstellen und Hintergrundfunktionen
- **Dienstkonten:** Separate API-Keys für FiveM Server und Discord Bot mit Least-Privilege-Prinzip.
- **Key-Hashing:** API-Keys werden ausschließlich als SHA-256 Hashes in der Datenbank gespeichert.
- **Verifizierungs-Route:** `/api/v1/verify` erfordert einen gültigen Bot-Schlüssel oder eine aktive Nutzersitzung für das eigene Konto.

### Bereich 6: Datenbank, Secrets und Infrastruktur
- **Prisma ORM:** Schutz vor SQL-Injection durch parametrisierte Abfragen.
- **Startup-Validierung:** `src/lib/env.ts` warnt bei Serverstart vor schwachen oder unsicheren Schlüsseln.
- **Migrationen:** Konsistente Schemamigration (`sessionVersion`, `PasswordResetToken`, `PrivateAttachment`).

### Bereich 7: Admin-Schutz, Audit-Logs & Wiederherstellung
- **Superadmin-Schutz:** Die Projektleitung kann weder gesperrt, gelöscht noch degradiert werden.
- **Aussperrschutz:** Das letzte verbleibende Administratorkonto kann sich nicht selbst sperren oder löschen.
- **Hierarchieprüfung:** Moderatoren und Administratoren können keine Benutzer mit gleichem oder höherem Rang bearbeiten (`canModifyTargetUser`).
- **Audit-Logs:** Unveränderliche, Append-Only Protokollierung (`recordAuditLog`). Passwörter und Secrets werden automatisch bereinigt (`[REDACTED]`).
- **Backups:** Automatisiertes Sicherungsskript `scripts/backup_database.ts` mit SHA-256-Prüfsummen und Rotation.

### Bereich 8: Automatisierte Nachweise
- **Automatisierte Testsuite (`scripts/test_security_hardening.ts`):** 27 von 27 Tests erfolgreich bestanden.
- **CAPTCHA Testsuite (`scripts/test_captcha_suite.ts`):** 24 von 24 Tests erfolgreich bestanden.

---

## 3. Testergebnisse im Detail

```text
===============================================================
VEGA CrimeLife Forum - Security Hardening Test Suite
===============================================================

--- 1. BERECHTIGUNGEN, IDOR & OBJEKTZUGRIFF ---
  [PASS] IDOR Schutz: Fremder Nutzer B darf Ticket von Nutzer A nicht abrufen
  [PASS] Geheimhaltung: Interne Team-Notizen werden für normale Nutzer serverseitig gefiltert
  [PASS] DM Zugriffsschutz: Unbeteiligter Nutzer B hat keinen Zugriff auf fremde Konversation

--- 2. SITZUNGEN, TOKEN-VERSION & SOFORTIGER WIDERRUF ---
  [PASS] JWT Signierung: sessionVersion (1) korrekt in SessionPayload eingebettet
  [PASS] Session Invalidation: sessionVersion atomar auf 2 erhöht
  [PASS] Sofortiger Sitzungswiderruf: Altes Token (v1) wird nach Sperre/Änderung (v2) abgewiesen

--- 3. PASSWORTRESET & REPLAY-SCHUTZ ---
  [PASS] Reset Token: Token initial als ungenutzt markiert
  [PASS] Reset Token: Erste Verwendung erfolgreich
  [PASS] Replay-Schutz: Zweite Verwendung desselben Reset-Tokens strikt abgewehrt

--- 4. HIERARCHIE, ROLLENINJEKTION & SUPERADMIN-SCHUTZ ---
  [PASS] Privilege Escalation Schutz: Moderator kann keine höhere Rolle vergeben
  [PASS] Superadmin-Schutz: Teammitglied darf Projektleitung nicht bearbeiten oder herabstufen
  [PASS] Aussperrschutz: isLastActiveAdmin prüft verbleibende Administratoren zuverlässig

--- 5. CSRF-SCHUTZ ---
  [PASS] CSRF-Schutz: Fremde Origin (evil-attacker-website.com) wird abgewehrt
  [PASS] CSRF-Schutz: Same-Origin Anfrage wird zugelassen

--- 6. DATEIUPLOADS & MAGIC BYTES ---
  [PASS] Magic Bytes: Echter JPEG Header wird als image/jpeg identifiziert
  [PASS] Upload-Härtung: Fake-JPEG mit PHP-Payload wird strikt abgewiesen
  [PASS] Upload-Härtung: SVG-Dateien und Script-Tags werden vollständig blockiert
  [PASS] Pfadtraversal-Schutz: Relative Sprünge (..) werden abgewehrt

--- 7. SSRF-SCHUTZ ---
  [PASS] SSRF-Schutz: Loopback 127.0.0.1 ist privat
  [PASS] SSRF-Schutz: RFC1918 10.0.0.1 ist privat
  [PASS] SSRF-Schutz: RFC1918 192.168.1.1 ist privat
  [PASS] SSRF-Schutz: Cloud Metadata 169.254.169.254 ist privat
  [PASS] SSRF-Schutz: IPv6 Loopback ::1 ist privat
  [PASS] SSRF-Schutz: Öffentliche IP 8.8.8.8 ist zulässig
  [PASS] SSRF-Prüfung: Direkter AWS/Cloud-Metadaten-Aufruf wird blockiert
  [PASS] SSRF-Prüfung: localhost-Aufrufe werden serverseitig abgewiesen

--- 8. API-SCHLÜSSEL & INTEGRATIONS-AUTHENTIFIZIERUNG ---
  [PASS] Integrations-Architektur: DISCORD_BOT Dienstkonto in Datenbank definiert

===============================================================
ZUSAMMENFASSUNG: 27 Bestanden | 0 Fehlgeschlagen
===============================================================
```

---

## 4. Abhängigkeiten-Check (`npm audit`)

Bei der Überprüfung mit `npm audit` wurden Upstream-Hinweise festgestellt:
- `postcss` (gebündelt in `next@15.1.7` Build-Tools): Ein automatisches `npm audit fix --force` würde Next.js 16 installieren (Breaking Change für React 19). Dies betrifft ausschließlich die serverseitige CSS-Kompilierung während des Builds und stellt im laufenden Anwendungsbetrieb kein ausnutzbares Risiko dar.
- Alle direkten Laufzeit-Bibliotheken (`jose`, `bcryptjs`, `pngjs`) arbeiten sicher und ohne bekannte Schwachstellen.

---

## 5. Konfiguration & Umgebungsvariablen (`.env`)

| Variable | Beschreibung | Standard / Anforderung |
| :--- | :--- | :--- |
| `DATABASE_URL` | SQLite / PostgreSQL Verbindung | `"file:./prisma/dev.db"` |
| `JWT_SECRET` | Geheimer Schlüssel für Sitzungs-JWTs | Mind. 32 Zeichen, in Prod rotieren! |
| `CAPTCHA_SECRET` | HMAC-Schlüssel für CAPTCHA-Lösungen | Mind. 32 Zeichen |
| `TRUSTED_PROXY` | Vertrauenswürdige Reverse Proxies | `"true"` bei Cloudflare / Nginx |
| `NEXT_PUBLIC_APP_URL` | Kanonische URL des Forums | z.B. `"https://vega-crimelife.de"` |
| `DISCORD_INTEGRATION_API_KEY`| API-Key für Bot-Kommunikation | Zufalls-String (im ACP hinterlegt) |

---

## 6. Empfehlungen für den Produktivbetrieb (Infrastruktur & Ops)

1. **Reverse Proxy (Nginx / Caddy):**
   - TLS 1.3 mit Let's Encrypt Zertifikat erzwingen.
   - Max Request Body Size auf 12 MB begrenzen (`client_max_body_size 12M;`).
   - Rate Limiting auf Nginx-Ebene für `/api/auth/*` als vorgelagerter DDoS-Schutz.
2. **Datenbank-Backups:**
   - Cronjob für `npx tsx scripts/backup_database.ts` (z.B. täglich um 03:00 Uhr) einrichten.
   - Das Verzeichnis `backups/db` auf einen externen, verschlüsselten Objektspeicher synchronisieren.
3. **Produktions-Geheimnisse:**
   - Vor Produktivgang `JWT_SECRET` und `CAPTCHA_SECRET` mit `openssl rand -hex 32` neu generieren.
