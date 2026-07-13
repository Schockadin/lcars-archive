# 🖖 Neo Archive — LCARS Archive

Ein webbasiertes Kampagnen-Archiv für eine Sci-Fi-Rollenspielrunde, gestaltet im
Look-and-Feel des **LCARS**-Computerinterfaces (Library Computer Access/Retrieval System).
Charaktere, Missionen und Mission-Logs werden in einer PostgreSQL-Datenbank
gepflegt (alleinige Source of Truth) und als responsives Next.js-Frontend
ausgegeben. Ein Markdown-Vault (Obsidian-kompatibel) diente als
Ursprungsimport; ein vollständiges DB-Backup (Export/Restore als JSON,
Admin-Panel) sichert seither den laufenden Datenbestand — siehe
[`docs/content-creation-strategy.md`](docs/content-creation-strategy.md).

> Die Oberfläche ist durchgängig auf **Deutsch**.

---

## ✨ Features

- **LCARS-Oberfläche** — eigene UI-Komponenten (Sidebar, Header, Elbow-Bars, Data-Rows,
  blinkende Statuspunkte) im klassischen Star-Trek-Stil, inkl. Live-Stardate.
- **Charakter-Datenbank** — Profile mit Rang, Spezies, Heimatwelt, Zugehörigkeiten,
  Aliassen und Status (`active` / `retired` / `deceased`).
- **Missionen & Mission-Logs** — Logbucheinträge sind Charakteren und Missionen zugeordnet
  und chronologisch nach Session-Nummer sortiert.
- **Nutzerkonten & Rollen** — fünf Rollen (Administration/Spielleitung/Spieler:in/
  Betrachter:in/Gast) mit abgestuften Rechten; Konten entstehen nur per Einladung
  (Aktivierungsmail mit Passwort-Setup-Link).
- **Eigene Inhalte** — eingeloggte User legen eigene Charaktere, Einsatzberichte,
  Archiv-Einträge und Gespräche zwischen Charakteren an, mit Sichtbarkeitsstufen
  (privat/GM/öffentlich) und einem persönlichen Dashboard (farbcodierter News-Feed,
  offene Gespräche, Lesezeichen/Abos).
- **Markdown-Editor** — Formatierungs-Toolbar, Rohtext/Vorschau-Umschalter und
  automatische bzw. manuelle Verlinkung (`[[Wikilinks]]`) zwischen Inhalten.
- **PWA mit Push-Benachrichtigungen** — installierbar auf Mobilgeräten (inkl. maskable
  Icon), Web-Push für neue Dialog-Nachrichten und abonnierte Inhalte.
- **Tutorial-Seite** — erklärt alle Funktionen für Besucher, User und Spielleitung.
- **Markdown-Vault als Ursprungsimport** — Inhalte lassen sich initial aus
  `.md`-Dateien mit YAML-Frontmatter (Obsidian-kompatibel) importieren; neue Inhalte
  entstehen danach direkt in der App (Datenbank als alleinige Source of Truth).
- **DB-Backup** — der komplette Datenbankinhalt lässt sich im Admin-Panel als
  JSON-Datei herunterladen und bei Bedarf wieder vollständig einspielen.
- **Custom-Markdown-Pipeline** — `remark`/`rehype` wandeln Markdown in HTML um und rendern
  `h2`-Überschriften als LCARS-Data-Rows.
- **SEO-fertig** — `robots.ts`, `sitemap.ts`, dynamische Metadaten und 404-Seite.
- **Rechtskonform** — Impressum und Datenschutz (DSGVO) bereits angelegt.

---

## 🛠️ Tech-Stack

| Bereich    | Technologie                                                         |
| ---------- | ------------------------------------------------------------------- |
| Framework  | [Next.js 16](https://nextjs.org) (App Router)                       |
| UI         | [React 19](https://react.dev)                                       |
| Styling    | [Tailwind CSS v4](https://tailwindcss.com)                          |
| Datenbank  | PostgreSQL (via [`postgres`](https://github.com/porsager/postgres)) |
| Content    | Markdown + YAML-Frontmatter (`gray-matter`, `remark`, `rehype`)     |
| Schriften  | Antonio & Share Tech Mono (`next/font`)                             |
| Sprache    | TypeScript                                                          |
| Deployment | Netlify (`@netlify/plugin-nextjs`)                                  |

---

## 🚀 Schnellstart

### Voraussetzungen

- Node.js 20+
- Zugriff auf eine PostgreSQL-Datenbank
- Ein Markdown-Vault mit den Inhalten (Ordner `Charaktere/`, `Missionen/` …)

### 1. Abhängigkeiten installieren

```bash
npm install
```

### 2. Umgebungsvariablen anlegen

Lege eine Datei `.env.local` an (Vorlage: [`.env.example`](.env.example)):

```bash
# PostgreSQL-Verbindungsstring
DATABASE_URL="postgres://user:password@host:5432/datenbank"

# Pfad zum Markdown-Vault (für die Ingestion)
VAULT_PATH="/pfad/zum/vault"

# Cache-Revalidation nach dem Ingest (siehe Hinweis unten)
SITE_URL="http://localhost:3000"
REVALIDATE_SECRET="ein-langes-zufaelliges-secret"
```

> **Cache-Hinweis (wichtig für die lokale Entwicklung):** Die Datenabfragen
> nutzen `unstable_cache`. Ein Import (`db:ingest`) invalidiert die Caches nur,
> indem er nach Abschluss `POST /api/revalidate` auf den/die in `SITE_URL`
> hinterlegten Server schickt. `SITE_URL` darf eine **kommaseparierte Liste**
> sein — nimm `http://localhost:3000` mit auf, damit auch der laufende
> Dev-Server invalidiert wird, sonst zeigt er nach dem Import veraltete (oder
> leere) Daten:
>
> ```bash
> SITE_URL="https://neo-archiv.de, http://localhost:3000"
> ```
>
> `REVALIDATE_SECRET` muss auf jedem Ziel-Server identisch gesetzt sein, und der
> Dev-Server muss während des Imports laufen.

### 3. Datenbankschema anlegen

```bash
npm run db:setup
```

Liest `scripts/schema.sql` ein und erstellt alle Tabellen
(`characters`, `missions`, `mission_logs`, `archive_entries`, …).

### 4. Ersten Admin-User anlegen

```bash
npm run db:create-admin
```

Legt einen Admin-Account an, aber nur wenn `users` noch komplett leer ist —
Adresse/Name kommen aus `ADMIN_EMAIL`/`ADMIN_NAME` (siehe `.env.example`).
Ohne gesetztes `ADMIN_PASSWORD` wird eins generiert und einmalig in der
Konsole ausgegeben.

### 5. Inhalte importieren

```bash
npm run db:ingest
```

Liest die Markdown-Dateien aus `VAULT_PATH` ein und schreibt sie per Upsert in die Datenbank.

> **Nur neue Dateien:** `npm run db:ingest:new` verarbeitet ausschließlich
> Dateien, deren `slug` noch nicht in der Datenbank existiert — nützlich bei
> großen Vaults, um nicht bei jedem Lauf alles neu zu importieren. Sobald ein
> Slug einmal importiert wurde, fasst dieses Skript ihn nie wieder an, auch
> nicht nach Bearbeitungen der Quelldatei — dafür bleibt `npm run db:ingest`
> zuständig.

> **Sicherung des DB-Stands:** Neue/bearbeitete Inhalte entstehen über die
> Web-App direkt in der Datenbank, es gibt keine Rückrichtung DB → Vault mehr.
> Um den kompletten Datenbankinhalt zu sichern, im Admin-Panel (`/users` →
> „Admin Actions“ → „DB-Backup“) auf „Backup herunterladen“ klicken; über
> „Backup einspielen“ lässt sich eine solche Datei auch wieder vollständig
> zurückspielen — siehe `docs/content-creation-strategy.md`.

### 6. Entwicklungsserver starten

```bash
npm run dev
```

> **Hinweis:** `npm run dev` lädt immer `.env.dev` (nicht `.env.local`) —
> der lokale Entwicklungsserver läuft damit standardmäßig gegen die Dev-DB
> statt gegen die in `.env.local` hinterlegte Datenbank, um ein versehentliches
> Schreiben gegen Production beim Entwickeln auszuschließen. `.env.dev` muss
> dafür angelegt sein (siehe „Dev-/Preview-Umgebung" unter Deployment). Alle
> anderen Befehle (`db:ingest`, `db:setup`, …) nutzen weiterhin `.env.local`,
> sofern nicht explizit die `:dev`-Variante aufgerufen wird.

Anschließend die angezeigte Adresse im Browser öffnen.

---

## 📜 NPM-Skripte

| Skript              | Beschreibung                                       |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Startet den Entwicklungsserver (gegen `.env.dev`)  |
| `npm run build`     | Erstellt den Produktions-Build                     |
| `npm run start`     | Startet den Produktionsserver                      |
| `npm run lint`      | Führt ESLint aus                                   |
| `npm run db:setup`      | Legt das Datenbankschema an (`scripts/schema.sql`)        |
| `npm run db:create-admin` | Legt einen Admin-User an, nur wenn `users` leer ist      |
| `npm run db:ingest`     | Importiert den kompletten Markdown-Vault                  |
| `npm run db:ingest:new` | Importiert nur Dateien mit noch unbekanntem `slug`        |
| `npm run db:characters` | Importiert nur die Charaktere                            |
| `npm run db:missions`   | Importiert nur Missionen + Mission-Logs                  |
| `npm run db:archive`    | Importiert nur die Archiv-Einträge                       |
| `npm run db:revalidate` | Invalidiert nur die Caches (siehe `SITE_URL`)            |
| `npm run db:reset`      | Setzt die Datenbank zurück                                |

Jedes `db:*`-Skript gibt es zusätzlich als `:dev`-Variante (z.B.
`db:setup:dev`, `db:ingest:dev`, `db:reset:dev`) — identisch, nur mit
`--env-file=.env.dev` statt `.env.local`. Siehe „Dev-/Preview-Umgebung"
unter Deployment.

---

## 📂 Projektstruktur

```
.
├── scripts/
│   ├── schema.sql            # PostgreSQL-Schema
│   ├── setup-db.ts           # Schema anlegen
│   ├── reset-db.ts           # Datenbank zurücksetzen
│   └── ingest/               # Markdown-Vault → Datenbank
│       ├── index.ts          # Einstiegspunkt der Ingestion
│       ├── characters.ts
│       ├── missions.ts
│       ├── missionLogs.ts
│       ├── archive.ts        # Archiv-Einträge + Querverweise
│       └── shared.ts         # Markdown→HTML, Validierung
└── src/
    ├── app/                  # Next.js App Router (Seiten & API-Routes)
    │   ├── page.tsx           # "/" — Landingpage (anonym) / Dashboard (eingeloggt)
    │   ├── Dashboard.tsx       # Persönliches Dashboard: News-Feed, offene Gespräche, Abos
    │   ├── characters/        # Charakterübersicht & -detailseiten
    │   ├── missions/
    │   ├── archive/
    │   ├── dialogues/         # Öffentliche Ansicht abgeschlossener Gespräche
    │   ├── timeline/
    │   ├── tutorial/          # Anleitung für Besucher/User/Spielleitung
    │   ├── login/, activate/, forgot-password/
    │   ├── users/             # Profil+Settings, Nutzerverwaltung, eigene Inhalte anlegen
    │   ├── api/               # /api/characters, /api/health …
    │   ├── manifest.ts        # PWA-Manifest (Icons, inkl. maskable)
    │   ├── robots.ts
    │   └── sitemap.ts
    ├── components/lcars/      # LCARS-UI-Komponenten
    ├── context/              # React-Context (Neo)
    ├── hooks/                # useNeo, usePageMeta …
    ├── lib/                  # DB-Zugriff & Datenabfragen
    ├── types/                # TypeScript-Typen
    └── utils/                # Stardate, Datumsformatierung …
```

---

## 🗃️ Inhaltsmodell

Die Inhalte stammen aus Markdown-Dateien mit YAML-Frontmatter. Beispiel für einen Charakter:

```markdown
---
type: character
slug: jean-luc-picard
name: Jean-Luc Picard
status: active
rank: Captain
species: Mensch
homeworld: La Barre, Erde
affiliation:
  factions: [Föderation]
  ships: [USS Enterprise]
  division: Command
aliases: [Locutus]
---

## Biografie

Öffentlicher Inhalt …

<!-- private -->

Dieser Abschnitt ist nur für die GM-Sicht und wird nicht veröffentlicht.
```

- **`type`** steuert, in welche Tabelle ein Eintrag wandert (`character`,
  `mission`, `mission-log`, `archive-entry`).
- **`slug`** muss URL-sicher sein (`a–z`, `0–9`, `-`).
- **`owner`** (optional, außer bei Charakteren: dort steuert `player` dieselbe
  Zuordnung) verweist per User-Slug auf den Owner des Inhalts — Grundlage für
  das Sichtbarkeits-Flag (`private`/`gm`/`public`). Unbekannte/fehlende Werte
  brechen den Import nicht ab, der Inhalt bleibt dann ownerlos. Bei
  Mission-Logs fällt der Owner ohne `owner`-Feld automatisch auf den Spieler
  des `author`-Charakters zurück.
- Alles nach `<!-- private -->` wird beim Import abgeschnitten.

Archiv-Einträge (`type: archive`) liegen im Ordner `Archiv/`, organisiert nach
Kategorie-Unterordnern (`Dialoge/`, `Fraktionen/`, `Items/`, `Lore/`, `NPCs/`,
`Orte/`, `Schiffe/`, `Spezies/`):

```markdown
---
type: archive
slug: tanghal-iv
title: Tanghal IV
category: location # optional — sonst aus dem Ordner abgeleitet
teaser: Klasse-M-Planet im Epetra-Sektor.
location_type: planet
system: Epetra
controlled_by: sternenflotte # Slug → archive_links
related_factions: [epetraner]
related_characters: [lorzan-keen] # Slug → /characters/…
related_missions: [erster-kontakt] # Slug → /missions/…
tags: [planet, klasse-m]
---

Öffentlicher Inhalt …
```

- **`category`** ist einer der acht Werte (`person`, `location`, `item`,
  `faction`, `theory`, `event`, `species`, `other`). Fehlt das Feld (z.B. bei
  Orten/Schiffen), wird es aus dem Top-Level-Ordner abgeleitet.
- **`teaser`** dient als Kurzbeschreibung (Übersicht + Meta-Description).
- Typ-spezifische Skalar-Felder (`status`, `system`, `class`, …) erscheinen als
  Datenfelder auf der Detailseite.
- **Referenz-Felder** (`related_*`, `controlled_by`, `leader`, `participants`,
  …) enthalten Ziel-`slugs`. Verweise auf andere Archiv-Einträge landen in
  `archive_links` (Detailseite: „Verweise“ + Rückverweise „Erwähnt in“);
  Verweise auf Charaktere bzw. Missionen werden als verlinkte Chips angezeigt.

---

## 🚢 Deployment

Das Projekt ist für **Netlify** vorkonfiguriert (`@netlify/plugin-nextjs`).
`DATABASE_URL` als Environment-Variable im Netlify-Dashboard hinterlegen; die Ingestion
(`db:setup` / `db:ingest`) wird gegen die produktive Datenbank ausgeführt.

### Tägliches DB-Backup

`.github/workflows/daily-db-backup.yml` läuft täglich um 03:00 UTC (plus
manuell auslösbar über "Run workflow") und lädt einen vollständigen
DB-Export (`scripts/backup-db.ts`, dieselbe Export-Logik wie der
"DB-Backup herunterladen"-Button im Adminpanel) nach Cloudflare R2 hoch.
Dafür müssen folgende Repository-Secrets gesetzt sein (GitHub → Settings →
Secrets and variables → Actions → "New repository secret"):

| Secret | Wert |
|---|---|
| `DATABASE_URL` | Dieselbe produktive Connection-URL wie im Netlify-Dashboard — muss hier **zusätzlich** als GitHub-Secret hinterlegt werden, GitHub Actions liest Netlifys Environment-Variablen nicht automatisch mit. |
| `R2_ACCOUNT_ID` | Cloudflare-Account-ID (Cloudflare-Dashboard → R2 → Account-Details). |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2-API-Token mit Schreibrecht auf den Ziel-Bucket (R2 → "Manage API Tokens"). |
| `R2_BUCKET_NAME` | Name des Ziel-Buckets für die Backup-Dateien (`db-backups/<Datum>.json`, ein Key pro Kalendertag). |

Aufbewahrungsfrist/automatisches Löschen alter Backups ist bewusst kein
Skript-Feature, sondern über eine Lifecycle-Regel direkt auf dem R2-Bucket
konfigurierbar (Cloudflare-Dashboard → Bucket → Lifecycle Rules).

### Dev-/Preview-Umgebung

Netlify Deploy-Previews (ein Build pro PR) laufen standardmäßig gegen
dieselbe `DATABASE_URL` wie Production — jede PR, die das Schema ändert,
riskiert damit entweder einen kaputten Preview-Build (Schema noch nicht
migriert) oder eine versehentliche Migration gegen Live-Daten. Der Code
selbst ist environment-agnostisch (`src/lib/db.ts` und alle
`scripts/ingest/*.ts` lesen nur `DATABASE_URL`/`DIRECT_DATABASE_URL` aus der
Umgebung, ohne jede Verzweigung) — eine zweite, isolierte DB einzurichten
ist deshalb reine Konfiguration, kein Code-Change.

**1. Zweite Postgres-Instanz anlegen.** Bei Railway: im Projekt ein
zweites **Environment** anlegen (z.B. `dev`, neben `production`) und dort
einen eigenen Postgres-Service erzeugen — Railways eingebautes Feature für
genau diesen Zweck, optional als Klon der aktuellen Produktionsdaten
startbar. Die **öffentliche** Connection-URL verwenden (nicht die interne
private-network-URL) — nur die ist von außerhalb Railways erreichbar, z.B.
von Netlifys Build-Runnern.

**2. Netlify auf zwei DBs aufteilen** (Netlify-Dashboard, nicht
`netlify.toml` — dort dürfen keine Secrets landen):
- Bestehende `DATABASE_URL` auf Scope **„Production"** einschränken
  (vermutlich aktuell „All contexts").
- Neue `DATABASE_URL` mit Scope **„Deploy previews"** hinzufügen, Wert =
  öffentliche Connection-URL der neuen Dev-DB aus Schritt 1.
  `DIRECT_DATABASE_URL` wird von Next.js selbst nicht gelesen (nur von den
  Ingest-Skripten, die nie auf Netlify laufen) — dort ist nichts zu tun.

**3. Lokal gegen die Dev-DB arbeiten.** `.env.dev` anlegen (Vorlage
[`.env.example`](.env.example)) mit der Connection-URL aus Schritt 1, dann
`npm run db:setup:dev` und `npm run db:ingest:dev` statt der `:local`-Pendants.
Vor einer Schema-ändernden PR erst `db:setup:dev` gegen die Dev-DB laufen
lassen, um die Migration risikofrei zu proben — der eigentliche
Migrationsschritt gegen Production bleibt weiterhin manuell (siehe oben).

> **Hinweis:** Deploy-Previews bauen bei jedem Push neu (Inhalte werden zur
> Build-Zeit statisch gerendert) — nach einem Ingest in die Dev-DB reicht ein
> neuer Push bzw. Re-Deploy, um aktualisierte Inhalte in der Preview zu sehen.
> Eine Revalidation-Verkabelung für die (pro PR wechselnde) Preview-URL ist
> dafür nicht nötig.

### Versionsnummer

Die App hat den Beta-Status verlassen und zeigt im Footer eine feste
semantische Versionsnummer (z.B. `v1.9.2`), sichtbar in der roten Leiste
neben „Impressum"/„Datenschutz". Anders als die frühere git-basierte
Beta-Zählung (`0.<PR-Nr>.<Commit-Nr>`) ist das jetzt eine einfache
String-Konstante in [`src/lib/version.ts`](src/lib/version.ts), die bei
jedem Feature/Fix von Hand hochgezählt wird (Patch für Fixes, Minor für
neue Features) — kein Build-Schritt, keine Git-Historie nötig.

---

## 📄 Lizenz

Privates Projekt. _Star Trek_ und _LCARS_ sind Marken von CBS Studios Inc.
Dieses Fan-Projekt steht in keiner Verbindung zu den Rechteinhabern.

---

<p align="center"><em>„Live long and prosper.“ 🖖</em></p>
```
