# 🖖 Neo Archive — LCARS Archive

Ein webbasiertes Kampagnen-Archiv für eine Sci-Fi-Rollenspielrunde, gestaltet im
Look-and-Feel des **LCARS**-Computerinterfaces (Library Computer Access/Retrieval System).
Charaktere, Missionen und Mission-Logs werden aus einem Markdown-Vault eingelesen,
in einer PostgreSQL-Datenbank gespeichert und als responsives Next.js-Frontend ausgegeben.

> Die Oberfläche ist durchgängig auf **Deutsch**.

---

## ✨ Features

- **LCARS-Oberfläche** — eigene UI-Komponenten (Sidebar, Header, Elbow-Bars, Data-Rows,
  blinkende Statuspunkte) im klassischen Star-Trek-Stil, inkl. Live-Stardate.
- **Charakter-Datenbank** — Profile mit Rang, Spezies, Heimatwelt, Zugehörigkeiten,
  Aliassen und Status (`active` / `retired` / `deceased`).
- **Missionen & Mission-Logs** — Logbucheinträge sind Charakteren und Missionen zugeordnet
  und chronologisch nach Session-Nummer sortiert.
- **Markdown-Vault als Quelle** — Inhalte werden aus `.md`-Dateien mit YAML-Frontmatter
  (Obsidian-kompatibel) eingelesen. Ein `<!-- private -->`-Marker trennt öffentliche von
  GM-internen Inhalten.
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

Lege eine Datei `.env.local` im Projektwurzelverzeichnis an:

```bash
# PostgreSQL-Verbindungsstring
DATABASE_URL="postgres://user:password@host:5432/datenbank"

# Pfad zum Markdown-Vault (für die Ingestion)
VAULT_PATH="/pfad/zum/vault"
```

### 3. Datenbankschema anlegen

```bash
npm run db:setup
```

Liest `scripts/schema.sql` ein und erstellt alle Tabellen
(`characters`, `missions`, `mission_logs`, `archive_entries`, …).

### 4. Inhalte importieren

```bash
npm run db:ingest
```

Liest die Markdown-Dateien aus `VAULT_PATH` ein und schreibt sie per Upsert in die Datenbank.

### 5. Entwicklungsserver starten

```bash
npm run dev
```

> **Hinweis:** Das `dev`-Skript bindet aktuell an einen festen Host
> (`--hostname 192.168.178.x`). Für lokale Entwicklung ggf. in `package.json` anpassen
> oder den Wert auf `localhost` setzen.

Anschließend die angezeigte Adresse im Browser öffnen.

---

## 📜 NPM-Skripte

| Skript              | Beschreibung                                       |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Startet den Entwicklungsserver                     |
| `npm run build`     | Erstellt den Produktions-Build                     |
| `npm run start`     | Startet den Produktionsserver                      |
| `npm run lint`      | Führt ESLint aus                                   |
| `npm run db:setup`  | Legt das Datenbankschema an (`scripts/schema.sql`) |
| `npm run db:ingest` | Importiert den Markdown-Vault in die Datenbank     |
| `npm run db:reset`  | Setzt die Datenbank zurück                         |

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
│       └── shared.ts         # Markdown→HTML, Validierung
└── src/
    ├── app/                  # Next.js App Router (Seiten & API-Routes)
    │   ├── characters/       # Charakterübersicht & -detailseiten
    │   ├── missions/
    │   ├── archive/
    │   ├── timeline/
    │   ├── api/              # /api/characters, /api/health …
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

- **`type`** steuert, in welche Tabelle ein Eintrag wandert (`character`, …).
- **`slug`** muss URL-sicher sein (`a–z`, `0–9`, `-`).
- Alles nach `<!-- private -->` wird beim Import abgeschnitten.

---

## 🚢 Deployment

Das Projekt ist für **Netlify** vorkonfiguriert (`@netlify/plugin-nextjs`).
`DATABASE_URL` als Environment-Variable im Netlify-Dashboard hinterlegen; die Ingestion
(`db:setup` / `db:ingest`) wird gegen die produktive Datenbank ausgeführt.

---

## 📄 Lizenz

Privates Projekt. _Star Trek_ und _LCARS_ sind Marken von CBS Studios Inc.
Dieses Fan-Projekt steht in keiner Verbindung zu den Rechteinhabern.

---

<p align="center"><em>„Live long and prosper.“ 🖖</em></p>
```
