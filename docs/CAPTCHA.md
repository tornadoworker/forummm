# 🛡️ VEGA CrimeLife — Hauseigenes CAPTCHA System (Dokumentation)

Vollständig eigenentwickeltes, serverseitiges CAPTCHA- und Bot-Abwehrsystem für das VEGA CrimeLife Forum. Das System kommt komplett ohne externe Dienste (wie Google reCAPTCHA oder Cloudflare Turnstile) und ohne Drittanbieter-APIs aus.

---

## 📐 Architektur & Funktionsweise

```
[Browser / Client]
       │
       ├─► 1. POST /api/captcha/challenge { action: "REGISTER" }
       │        └──► Server generiert Code & HMAC-SHA256(Code, CAPTCHA_SECRET)
       │        └──► Speichert Challenge in SQLite (TTL: 3 Min, Max: 5 Versuche)
       │        └──► Liefert { challengeId } zurück (Lösung bleibt geheim!)
       │
       ├─► 2. GET /api/captcha/image/:id  ──► Liefert serverseitig erzeugtes PNG
       ├─► 3. GET /api/captcha/audio/:id  ──► Liefert synthetisiertes WAV-Audio
       │
       └─► 4. POST /api/auth/register { ..., captchaChallengeId, captchaResponse }
                └──► Atomare Transaktionsprüfung via Prisma ($transaction)
                └──► Timing-Safe HMAC-Abgleich (crypto.timingSafeEqual)
                └──► Sofortige Entwertung (isInvalidated = true, Replay-Schutz)
```

---

## 1. CAPTCHA Aufgaben & Generierung

### Zeichenauswahl
- **Zeichensatz**: `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (31 Zeichen).
- **Ausschluss**: Verwechslungsgefährdete Zeichen wurden vollständig entfernt:
  - Ziffer `0` und Buchstabe `O` / `o`
  - Ziffer `1` und Buchstaben `I` / `l` / `i`
- **Länge**: Zufällig 5 bis 6 Zeichen pro Aufgabe.
- **Toleranz**: Groß- und Kleinschreibung wird bei der Antwortprüfung ignoriert (`k7xp` = `K7XP`).

### Bild-Synthese (`src/lib/captcha/imageGenerator.ts`)
- Reines serverseitiges PNG-Rendering über `pngjs` (ohne native C++ Bibliotheken).
- **Verzerrung & Lesbarkeit**:
  - Zufällige Drehung jedes Zeichens um -15° bis +15°.
  - Vertikaler und horizontaler Jitter (+/- 6px).
  - Skalierung mit fettem 3-Pixel-Pinsel für einwandfreie menschliche Lesbarkeit.
  - Subtile sinusförmige Wellenlinie im Zeichenverlauf.
  - Dunkles VEGA CrimeLife Farbschema (`#121216`) mit Hochkontrast-Farben (`#F5F5F5`, `#E9D5FF`, `#C084FC`, `#38BDF8`).
  - 3-4 moderate Störlinien und 40-50 Hintergrund-/Vordergrund-Rauschpunkte zur Erschwerung einfacher OCR-Angriffe.

### Audio-Alternative (`src/lib/captcha/audioGenerator.ts`)
- Reines lokales 16-Bit Mono PCM RIFF WAV (16.000 Hz).
- Akustische Formant- und Zischlautsynthese aller 31 Zeichen.
- Klare akustische Schritt-Kennzeichnung (Chimes) zwischen den Zeichen.
- Unabhängig vom Internet oder externen Speech-APIs voll funktionsfähig.

### Barrierefreiheit
- Tastaturbedienbar (Tab, Enter, Space).
- Zugängliche ARIA-Regionen (`aria-label`, `aria-describedby`, `aria-invalid`).
- Direkter barrierefreier Supportweg über den Hilfe-Dialog (`/support`).

---

## 2. Kryptografische Sicherheit & Speicherung

1. **Kein Klartext in der Datenbank**:
   - Die Lösung wird ausschließlich als **HMAC-SHA256** mit dem serverseitigen Geheimnis `CAPTCHA_SECRET` persistiert.
2. **Zeitkonstanter Vergleich (`crypto.timingSafeEqual`)**:
   - Schützt vor Seitenkanal- und Timing-Angriffen.
3. **Flüchtiger Render-Payload**:
   - Zur Bild- und Audioausgabe wird der Code kurzzeitig im Arbeitsspeicher gehalten bzw. mit **AES-256-GCM** verschlüsselt gepuffert und nach der ersten Lösung oder nach Ablauf sofort gelöscht.
4. **Keine Datenlecks**:
   - Die Lösung taucht niemals in HTML-Attributen, Bildmetadaten, Dateinamen, URLs oder API-Antworten auf.
   - Alle Challenge-Antworten, Bilder und Audiodateien werden mit `Cache-Control: no-store, no-cache, must-revalidate` ausgeliefert.

---

## 3. Schutzregeln & Grenzwerte

| Parameter | Wert | Beschreibung |
|---|---|---|
| **Gültigkeit (TTL)** | 3 Minuten (180 s) | Nach Ablauf wird die Challenge serverseitig abgewiesen |
| **Max. Versuche** | 5 | Nach 5 falschen Eingaben wird die Challenge gesperrt |
| **Erneuerung** | Sofort | Erstellen einer neuen Challenge entwertet die vorherige der Session |
| **Replay-Schutz** | 100% | Gelöste Challenges werden in derselben Transaktion entwertet |
| **Login-Fehlversuche** | 3 Fehlversuche | Ab 3 Fehlern in 15 Min. schaltet Login auf CAPTCHA-Pflicht |
| **Spam-Schwellenwert** | 2 Aktionen / 3 Min. | Bei schneller Thread-/Ticket-Erstellung wird CAPTCHA verlangt |

---

## 4. Geschützte Aktionen

1. **Registrierung (`/register`, `POST /api/auth/register`)**:
   - Standardmäßig aktiv für jeden neuen Benutzer.
2. **Passwort zurücksetzen (`/forgot-password`, `POST /api/auth/forgot-password`)**:
   - Verhindert Account-Enumeration und Massen-E-Mails.
3. **Anmeldung (`/login`, `POST /api/auth/login`)**:
   - Adaptiv: Normale Logins sind CAPTCHA-frei. Nach 3 Fehlversuchen von derselben IP oder für denselben Account greift die CAPTCHA-Pflicht.
4. **Themenerstellung & Tickets (`/api/threads`, `/api/support/tickets`)**:
   - Adaptiv: Schlägt bei auffälliger Frequenz automatisch an. Normale Nutzer können ungestört schreiben.

---

## 5. Konfiguration (`.env`)

```env
# HMAC-Geheimnis zur Absicherung der CAPTCHA-Lösungen (Mindestens 32 Zeichen)
CAPTCHA_SECRET=""

# Vertrauenswürdige Proxy-Erkennung für Cloudflare / Reverse Proxies (true/false)
TRUSTED_PROXY="true"
```

---

## ⚠️ Grenzen des Systems (Sicherheitshinweis)

> [!IMPORTANT]
> Ein hauseigenes Bild- und Audio-CAPTCHA ist eine wirksame Hürde gegen automatisierte Bots, Credential-Stuffing-Skripte und Massenregistrierungen. **Es ist jedoch kein unüberwindbarer Schutz.**

- **Moderne Vision-KI**: Hochmoderne multimodale LLMs und trainierte neuronale Netze können viele Bild-CAPTCHAs lösen.
- **Defense-in-Depth**: Aus diesem Grund verlässt sich das VEGA Forum niemals auf das CAPTCHA allein, sondern kombiniert:
  1. Serverseitige Rate Limits (Prisma `RateLimitRecord`).
  2. Bindung an Session-Cookies und konkrete Aktionen.
  3. Max. 5 Versuche und 3 Minuten TTL.
  4. IP- und kontoübergreifende Zähler.
  5. Bestehende Rollen-, Berechtigungs- und Archiv-Prüfungen.
