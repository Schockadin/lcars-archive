# Migration auf einen netcup Root-Server

> **Status: Planung, noch nicht umgesetzt.** Dieses Dokument beschreibt den beschlossenen
> Weg — es ist noch keine Zeile davon im Code. Die Angaben zum Ist-Zustand sind gegen
> v1.48.1 geprüft. Wird bei der Umsetzung fortgeschrieben; nach dem Cutover wird daraus
> die Betriebsdokumentation.

## Ausgangslage und Ziel

Das LCARS-Archiv (Next.js 16.3.5, App Router, React 19) läuft heute verteilt über mehrere
Managed-Dienste: Netlify als Host (`netlify.toml`, `@netlify/plugin-nextjs`), eine externe
PostgreSQL-Instanz hinter pgBouncer (`DATABASE_URL`), zwei Cloudflare-R2-Buckets (Backups +
öffentliche Assets), Cloudflare Workers AI für die RAG-Antworten, OpenAI für Embeddings,
Resend für Mail und GitHub Actions für die nächtlichen Cronjobs.

Ziel: **Datenbank, WebApp, Node-Server, RAG-Index und Bucket ziehen vollständig auf einen
eigenen netcup Root-Server.** Extern bleiben nur noch OpenAI (Embeddings), Cloudflare
Workers AI (RAG-Antwortgenerierung) und Resend (Mail). Deploys sollen weiterhin durch einen
Push auf `master` ausgelöst werden — ohne manuelle Schritte auf dem Server.

Entschiedene Rahmenbedingungen (mit dem Nutzer abgestimmt):

| Frage | Entscheidung |
|---|---|
| Deploy-Stack | **Coolify** (self-hosted PaaS) |
| Tarif | **RS 1000 G12** starten, Upgrade-Entscheidung nach Messpunkt |
| Backups | **Extern** (off-site, nicht auf demselben Server) |
| Build-Ort | **GitHub Actions → GHCR → Coolify zieht das fertige Image** |
| RAG-LLM | **Cloudflare Workers AI bleibt extern** |

---

## 1. Tarif und Kosten

### Empfehlung: netcup RS 1000 G12

| | RS 1000 G12 | RS 2000 G12 |
|---|---|---|
| Kerne (dediziert, EPYC) | 4 | 8 |
| RAM (DDR5 ECC) | 8 GB | 16 GB |
| NVMe | 256 GB | 512 GB |
| Netz | 2,5 Gbit/s | 2,5 Gbit/s |
| Preis/Monat | **ca. 8,74 €** | ca. 16,89 € |

Warum Root-Server und nicht VPS: Die dedizierten Kerne sind für den pgvector-Indexaufbau beim
Re-Embedding (`npm run embed:all`) und für Postgres unter Last der relevante Unterschied;
beim VPS teilen sich die vCores die Hardware.

**RAM-Budget auf 8 GB** (deshalb ist der Build-in-Actions-Ansatz keine Option, sondern Bedingung):

| Dienst | ca. |
|---|---|
| Coolify + Traefik | 1,2 GB |
| PostgreSQL 16 + pgvector | 1,0 GB |
| pgBouncer | 0,05 GB |
| MinIO | 0,4 GB |
| Next.js (standalone, Node) | 0,8 GB |
| System/Docker | 0,6 GB |
| **Summe** | **~4,1 GB** — ~3,9 GB Reserve |

Passt, solange nicht gleichzeitig auf dem Server gebaut wird. Trotzdem **4 GB Swap-Datei**
anlegen, damit ein Embedding-Lauf oder ein Notfall-Build-from-Source nicht in den OOM-Killer
läuft.

### Messpunkt für das Upgrade auf RS 2000

Nach vier Wochen Realbetrieb prüfen (Werte aus Netdata/Coolify-Metriken). Upgrade ziehen, wenn
**eines** zutrifft:

- RAM-Auslastung im Tagesmittel > 70 % (= > 5,6 GB), oder
- Swap dauerhaft (nicht nur während `embed:all`) > 500 MB belegt, oder
- NVMe-Belegung > 180 GB (70 % von 256 GB — Postgres + MinIO + Docker-Images wachsen)
- 15-min-Load-Average regelmäßig > 4,0

Ein netcup-Upgrade ist ein Produktwechsel mit Neuinstallation. Weil der gesamte Server in
diesem Plan aus Coolify-Konfiguration + Restic-Backup reproduzierbar ist, ist der Umzug dann
ein halber Abend: neuen Server aufsetzen, Restic-Restore, DNS umhängen.

### Laufende Kosten im Vergleich

| Posten | Heute | Nachher |
|---|---|---|
| Netlify | Plan-abhängig | **entfällt** |
| Managed Postgres | Plan-abhängig | **entfällt** |
| Cloudflare R2 | Speicher + Operationen | **entfällt** |
| netcup RS 1000 G12 | — | ~8,74 € |
| Backup-Ziel (netcup Storage Space o. Hetzner Storage Box, ~100 GB) | — | ~3 € |
| OpenAI Embeddings | pay-as-you-go | unverändert |
| Cloudflare Workers AI | pay-as-you-go | unverändert |
| Resend | Free/Pro | unverändert |

Cloudflare-Konto bleibt bestehen (Workers AI, ggf. DNS) — nur R2 wird gekündigt.

---

## 2. Zielarchitektur

Ein Server, alles in Docker, von Coolify verwaltet. Traefik (von Coolify mitgebracht)
terminiert TLS und ist der einzige Dienst mit offenen Ports.

```
Internet ──► Traefik (Coolify) :80/:443 ── Let's Encrypt
              │
              ├─ neo-archiv.de         → app        (Next.js standalone, :3000)
              ├─ assets.neo-archiv.de  → minio      (:9000, nur GET öffentlich)
              └─ coolify.neo-archiv.de → Coolify-UI (IP-beschränkt)

   internes Docker-Netz (nichts davon nach außen exponiert):
     app ──► pgbouncer :6432 ──► postgres :5432   (pgvector/pgvector:pg16)
     app ──► minio :9000                          (S3-API, zwei Buckets)
     scheduled tasks (Coolify Cron) ──► pgbouncer / minio
     restic ──► off-site Storage (SFTP)
```

**Bewusste Entscheidungen:**

- **pgBouncer bleibt im Stack.** `src/lib/db.ts` ist auf Transaction-Mode ausgelegt
  (`prepare: false`, ausführlich kommentiert). pgBouncer mitzunehmen kostet 50 MB RAM und
  spart jede Code-Änderung an der DB-Schicht.
- **Postgres-Image `pgvector/pgvector:pg16`** — exakt das Image, das `ci.yml` schon für die
  Integrationstests nutzt. Damit sind CI und Produktion bitgleich.
- **MinIO statt R2**, weil der Code bereits ausschließlich über `@aws-sdk/client-s3` geht
  (`src/lib/r2Backup.ts`). Es ändert sich nur der Endpoint.
- **Asset-Bucket bleibt öffentlich per eigener Subdomain.** `src/lib/assetStorage.ts`
  validiert `R2_ASSET_PUBLIC_BASE_URL` bereits darauf, dass dort eine echte Domain steht und
  kein Bucketname — `https://assets.neo-archiv.de` erfüllt das unverändert.
- **Kein `sharp`/Image-Optimizer nötig.** Alle `next/image`-Stellen mit externen URLs setzen
  bereits `unoptimized` (u. a. `src/app/characters/[slug]/CharacterPortrait.tsx:100`,
  `src/components/ContentBody.tsx:152`). `images.remotePatterns` wird nicht gebraucht.
- **Backups liegen nicht auf demselben Server.** Der bestehende `npm run db:backup` schreibt
  weiter in den (jetzt lokalen) Backup-Bucket, damit der Restore-Knopf im Adminpanel
  weiterfunktioniert. Zusätzlich sichert Restic Postgres-Dump + MinIO-Daten off-site.

---

## 3. Notwendige Code-Änderungen

Insgesamt überschaubar — der Code ist kaum an Netlify oder Cloudflare gebunden. Fünf
bestehende Dateien, vier neue.

### 3.1 `src/lib/r2Backup.ts` — S3-Endpoint konfigurierbar machen (Kernänderung)

Heute ist der Endpoint fest auf Cloudflare verdrahtet:

```ts
// createR2ClientFor(), aktuell
const accountId = requireEnv("R2_ACCOUNT_ID");
const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});
```

Umbau: Ist `S3_ENDPOINT` gesetzt, gilt dieser Endpoint und `R2_ACCOUNT_ID` wird **nicht** mehr
verlangt; ohne die Variable bleibt das bisherige R2-Verhalten unverändert (wichtig, damit
`.env.local`-Setups und ein Rollback auf R2 währen des Cutovers weiter funktionieren).

```ts
const endpoint =
  process.env.S3_ENDPOINT ?? `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`;
const client = new S3Client({
  region: process.env.S3_REGION ?? "auto",
  endpoint,
  // MinIO adressiert Buckets über den Pfad, nicht als Subdomain — ohne das
  // Flag baut das SDK http://bucket.minio:9000 und die Auflösung scheitert.
  forcePathStyle: Boolean(process.env.S3_ENDPOINT),
  credentials: { accessKeyId, secretAccessKey },
});
```

Die Variablennamen `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` /
`R2_ASSET_BUCKET_NAME` / `R2_ASSET_PUBLIC_BASE_URL` **bleiben wie sie sind**. Eine Umbenennung
auf `S3_*` würde sechs Dateien, zwei Workflows, `.env.example`, README und alle
Deployment-Secrets gleichzeitig anfassen — reines Rename-Risiko ohne funktionalen Gewinn. Der
Kopfkommentar der Datei wird stattdessen angepasst („S3-kompatibler Objektspeicher, per
`S3_ENDPOINT` auf MinIO oder R2 gerichtet").

### 3.2 `src/lib/rag.ts` — Cloudflare-Account-ID von R2 entkoppeln

Workers AI leitet die Account-ID heute aus `R2_ACCOUNT_ID` ab (Fallback-Kette an Zeile ~295
und ~337). Wenn R2 wegfällt, ist diese Variable nicht mehr gesetzt und der RAG-Assistent
fällt still aus. Fallback auf `R2_ACCOUNT_ID` entfernen, `CLOUDFLARE_ACCOUNT_ID` wird
Pflichtvariable für den RAG-Teil. Die beiden Fehlertexte
(`"CLOUDFLARE_ACCOUNT_ID/R2_ACCOUNT_ID / CLOUDFLARE_AI_API_TOKEN ist nicht gesetzt."`)
entsprechend kürzen, ebenso die Hinweistexte in `src/app/gm/chronologie/actions.ts:48` und
`src/app/gm/chronologie/TimelineInferencePanel.tsx:54`.

### 3.3 `next.config.ts` — drei Stellen

1. **`output: "standalone"` ergänzen.** Ohne das erzeugt `next build` kein
   selbstgenügsames Bundle und das Docker-Image müsste `node_modules` komplett mitschleppen
   (~1 GB statt ~200 MB).
2. **`netlifyOrigins()` ersetzen.** Die Funktion liest `URL` / `DEPLOY_PRIME_URL` /
   `DEPLOY_URL` — Netlify-Variablen, die es nachher nicht mehr gibt. Damit wäre
   `serverActions.allowedOrigins` leer und Next verglicht nur noch `Origin` gegen
   `X-Forwarded-Host`. Umbenennen in `deploymentOrigins()` und aus `NEXT_PUBLIC_BASE_URL`
   (plus optional einer kommaseparierten `ADDITIONAL_ORIGINS`) speisen. Die Kommentare, die
   Netlifys Proxy erklären, auf Traefik umschreiben.
3. **CSP: `frame-src 'self' https://app.netlify.com` → `frame-src 'self'`.** Das
   Netlify-Deploy-Preview-Overlay gibt es nicht mehr; die Ausnahme ersatzlos streichen.

`turbopackFileSystemCacheForBuild` bleibt bewusst auf `false`. Der Kommentar dort begründet
das mit Klartext-Secrets im Cache — in einem Docker-Build-Layer wäre das genauso falsch wie in
Netlifys Build-Infrastruktur, nur ohne Scanner, der es meldet.

### 3.4 `netlify.toml` und `@netlify/plugin-nextjs` entfernen

`netlify.toml` löschen, `@netlify/plugin-nextjs` aus den devDependencies in `package.json`
streichen, `package-lock.json` per `npm install` aktualisieren.

### 3.5 Neue Dateien

**`Dockerfile`** — Multi-Stage, `node:22-alpine` (Node 20 ist seit April 2026 EOL; siehe 4.1):

```
deps    → npm ci
builder → next build   (ARG NEXT_PUBLIC_BASE_URL, NEXT_PUBLIC_VAPID_PUBLIC_KEY,
                        ENV DATABASE_URL=postgresql://dummy… )
runner  → COPY .next/standalone, .next/static, public
          USER node, EXPOSE 3000, CMD ["node","server.js"]
          HEALTHCHECK → /api/health
```

Zwei Fallstricke, die der Build sonst ruiniert:

- **`NEXT_PUBLIC_*` müssen zur Build-Zeit da sein.** `NEXT_PUBLIC_VAPID_PUBLIC_KEY` und
  `NEXT_PUBLIC_BASE_URL` (`src/app/robots.ts:3`) werden ins Client-Bundle einkompiliert. Als
  `--build-arg` durchreichen, nicht erst zur Laufzeit setzen. Beide sind öffentlich, gehören
  also nicht in Secrets.
- **Dummy-`DATABASE_URL` im Builder-Stage.** `src/lib/db.ts` wirft beim Import, wenn die
  Variable fehlt; Module wie `visibility.ts` werden beim Build geladen. `ci.yml` löst das
  bereits genau so (`postgresql://user:pass@127.0.0.1:5432/dummy`) — dieselbe Zeile hier
  wiederverwenden. Eine echte DB-Verbindung braucht der Build nicht: es gibt kein
  `generateStaticParams` mehr im Baum (der Kommentar in `next.config.ts` ist an dieser Stelle
  veraltet).

**`.dockerignore`** — mindestens `node_modules`, `.next`, `.git`, `e2e`, `tests`, `.env*`,
`playwright-report`, `test-results`.

**`docker-compose.yml`** (für Coolifys „Docker Compose"-Ressource): `postgres` mit
`pgvector/pgvector:pg16` + benanntes Volume, `pgbouncer` (`edoburu/pgbouncer`,
`POOL_MODE=transaction`), `minio` + ein einmaliger `mc`-Init-Container, der die beiden Buckets
anlegt und dem Asset-Bucket eine anonyme Read-only-Policy gibt. Kein `ports:`-Mapping außer
für MinIO an Traefik — alles andere bleibt im internen Netz.

**`.github/workflows/deploy.yml`** — siehe Abschnitt 4.

### 3.6 Was *nicht* geändert werden muss

Zur Absicherung geprüft und unkritisch:

- `src/lib/db.ts` — unverändert. Mit pgBouncer im Stack bleibt `prepare: false` richtig.
  `DB_SSL="false"` wird gesetzt (Postgres steht im selben privaten Docker-Netz, genau der in
  den Kommentaren beschriebene Fall).
- `src/proxy.ts` — rein cookie-basiert, kein Hosting-Bezug.
- `src/app/api/health/route.ts` — existiert bereits (`SELECT 1`) und wird direkt als
  Coolify-Healthcheck verwendet. Kein Neubau nötig.
- Die Redirects in `next.config.ts` (`/status` → UptimeRobot, `/home`, `/missions/*`) laufen in
  Next selbst, nicht in Netlify — sie ziehen unverändert mit um.
- Web-Push (`web-push`, VAPID) ist vollständig self-contained, kein externer Dienst.

---

## 4. Workflow: Push → Build → Auto-Deploy

### 4.1 `.github/workflows/ci.yml` — zwei kleine Anpassungen

Der Workflow bleibt inhaltlich wie er ist (`lint`, `test`, `test:e2e`, Integrationstests gegen
`pgvector/pgvector:pg16`). Zwei Punkte:

- `node-version: 20` → `22`, damit CI, Dockerfile und Produktion dieselbe Laufzeit haben.
- **Neu und wichtig:** `next build` wird von CI heute überhaupt nicht ausgeführt — die
  E2E-Tests laufen laut `playwright.config.ts` gegen `npm run dev`. Der Docker-Build im
  Deploy-Workflow ist damit die erste Stelle, an der ein Produktionsbuild passiert. Deshalb
  gehört der Build-Job hinter, nicht neben die Tests (`needs: test`), damit ein Build-Fehler
  nicht als „Tests grün, Deploy kaputt" durchrutscht.

### 4.2 `.github/workflows/deploy.yml` (neu)

```yaml
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [master]
```

Job läuft nur bei `github.event.workflow_run.conclusion == 'success'`. Damit gilt garantiert:
**deployed wird nur, was grün ist.**

Schritte:
1. `docker/login-action` → `ghcr.io` mit dem automatischen `GITHUB_TOKEN`
   (`packages: write`).
2. `docker/build-push-action` mit `cache-from/to: type=gha` (spart bei Folge-Builds mehrere
   Minuten), Build-Args `NEXT_PUBLIC_BASE_URL` und `NEXT_PUBLIC_VAPID_PUBLIC_KEY` aus
   Repository-*Variables* (nicht Secrets — sie landen ohnehin im Client-Bundle).
3. Tags: `ghcr.io/schockadin/lcars-archive:master` **und** `:sha-<commit>`. Der SHA-Tag ist
   der Rollback-Pfad: in Coolify das vorherige Tag eintragen, Redeploy, fertig.
4. `curl -X GET "$COOLIFY_WEBHOOK_URL" -H "Authorization: Bearer $COOLIFY_TOKEN"` —
   Coolify zieht daraufhin das neue Image und startet den Container neu.

Neue Repository-Secrets: `COOLIFY_WEBHOOK_URL`, `COOLIFY_TOKEN`.
Neue Repository-Variables: `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.

Coolify selbst wird auf „Docker Image" statt „Git Repository" konfiguriert und bekommt
Health-Check auf `/api/health` — es schaltet erst um, wenn der neue Container gesund
antwortet (Zero-Downtime-Rolling-Update).

### 4.3 Die beiden Cron-Workflows müssen umziehen

`daily-db-backup.yml` und `admin-log-digest.yml` laufen heute in GitHub Actions und verbinden
sich mit `secrets.DATABASE_URL` direkt zur Produktionsdatenbank. **Nach dem Umzug steht
Postgres nur noch im internen Docker-Netz** — diese Workflows brechen. Die Datenbank dafür
nach außen zu öffnen wäre der falsche Weg.

Stattdessen werden beide zu **Coolify Scheduled Tasks**, die im selben Docker-Netz im
App-Container laufen:

| Heute | Nachher |
|---|---|
| `daily-db-backup.yml`, `0 3 * * *` | Coolify Scheduled Task `0 3 * * *`: `npm run db:backup && npm run db:backup:cleanup && npm run db:purge-deleted` |
| `admin-log-digest.yml`, `0 5 * * *` | Coolify Scheduled Task `0 5 * * *`: `npm run admin:log-digest` |

Die npm-Scripts selbst ändern sich nicht — sie laufen per `tsx --conditions=react-server` und
lesen ihre Variablen aus der Umgebung, die Coolify dem Container ohnehin gibt. Die
`tsx`-Aufrufe brauchen allerdings die devDependencies; entweder bekommt das Runner-Stage
`tsx` zusätzlich installiert, oder die Tasks laufen in einem zweiten, schlanken
„worker"-Container aus demselben Image mit vollen `node_modules`. **Empfehlung:** `tsx` +
`scripts/` ins Runner-Stage mitkopieren — das ist der kleinere Eingriff und hält es bei einem
Image.

Beide GitHub-Workflow-Dateien werden gelöscht, die zugehörigen Repository-Secrets
(`DATABASE_URL`, `R2_*`, `RESEND_*`) können danach aus GitHub entfernt werden.

---

## 5. Migrationsablauf (Cutover)

Reihenfolge so gewählt, dass bis Schritt 7 nichts Produktives angefasst wird und jeder Schritt
einzeln rückgängig zu machen ist.

1. **Server bestellen und härten.** RS 1000 G12, Ubuntu 24.04 LTS. SSH nur mit Key,
   Passwort-Login und Root-Login aus, `ufw` auf 22/80/443, `fail2ban`,
   `unattended-upgrades`, 4 GB Swap-Datei.
2. **Coolify installieren** (`curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`).
   UI auf eine eigene Subdomain legen und per Traefik-IP-Whitelist oder Basic-Auth schützen.
3. **DNS vorbereiten.** A/AAAA für `coolify.` und `assets.` setzen — die Hauptdomain noch
   *nicht* anfassen. TTL der Hauptdomain jetzt schon auf 300 s senken, damit der spätere
   Cutover schnell greift.
4. **Datenspeicher hochziehen.** `docker-compose.yml` als Coolify-Ressource deployen
   (Postgres + pgBouncer + MinIO). Schema einspielen mit
   `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/schema.sql` — exakt die Zeile, die
   `ci.yml` schon nutzt, nicht `scripts/setup-db.ts` (das fragt interaktiv nach der
   Schema-Datei und würde hängen).
5. **Daten übernehmen.**
   - Postgres: `pg_dump --no-owner --no-acl` von der alten DB → `pg_restore` in die neue.
     Anschließend prüfen, dass die `vector`-Extension und die `content_embeddings`-Tabelle da
     sind und die FTS-`search_vector`-Spalten befüllt sind (sie sind `GENERATED`, füllen sich
     also von selbst).
   - Buckets: `rclone sync r2:<backup-bucket> minio:<backup-bucket>` und dasselbe für den
     Asset-Bucket. Rclone kann beide Seiten als S3-Remote, das ist ein Einzeiler pro Bucket.
6. **App als Coolify-Application anlegen**, Quelle = GHCR-Image, alle Umgebungsvariablen
   setzen (inkl. `S3_ENDPOINT=http://minio:9000`, `DB_SSL=false`,
   `R2_ASSET_PUBLIC_BASE_URL=https://assets.neo-archiv.de`, `CLOUDFLARE_ACCOUNT_ID`).
   Zunächst auf eine **Staging-Subdomain** (`neu.neo-archiv.de`) legen und dort komplett
   durchtesten: Login, Bild-Upload, Portrait-Anzeige, PDF-Export, RAG-Abfrage, Push-Benachrichtigung,
   manueller DB-Export im Adminpanel.
7. **Cutover.** Hauptdomain-DNS auf den Server, Let's Encrypt abwarten,
   `NEXT_PUBLIC_BASE_URL` auf die Hauptdomain, Image neu bauen (die Variable ist
   build-time!), Staging-Subdomain entfernen.
8. **Nachlauf, mindestens zwei Wochen.** Netlify-Projekt und R2-Buckets bleiben unangetastet
   als Rückfallebene. Erst danach Netlify-Projekt löschen und R2 kündigen.
9. **Aufräumen.** GitHub-Secrets der alten Cron-Workflows entfernen, `netlify.toml` und
   `@netlify/plugin-nextjs` waren schon in Schritt 3.4 raus.

---

## 6. Backup und Betrieb

Der größte Unterschied zur heutigen Managed-Situation: Für Backups ist ab jetzt niemand sonst
zuständig. Zwei Ebenen:

**Ebene 1 — in der App (unverändert).** `npm run db:backup` schreibt den JSON-Export weiter in
den Backup-Bucket, jetzt MinIO statt R2. `db:backup:cleanup` hält 30 Tage. Damit funktioniert
der Restore-Knopf im Adminpanel wie bisher.

**Ebene 2 — off-site (neu, das eigentliche Sicherheitsnetz).** Restic-Container, täglich
04:00 UTC, Ziel per SFTP auf netcup Storage Space oder eine Hetzner Storage Box:
- `pg_dump -Fc` der Live-Datenbank
- das MinIO-Datenverzeichnis
- die Coolify-Konfiguration (damit der Server reproduzierbar bleibt)

Repository verschlüsselt (`restic init`), Retention `--keep-daily 7 --keep-weekly 4
--keep-monthly 6`. **Monatlich einen Restore auf einer Wegwerf-VM testen** — ein nie
wiederhergestelltes Backup ist kein Backup.

**Monitoring.** Der bestehende UptimeRobot-Check (`/status`-Redirect in `next.config.ts`)
bleibt und zeigt weiter auf die Hauptdomain. Zusätzlich sinnvoll: ein zweiter Check auf
`/api/health` (prüft im Gegensatz zur Startseite auch die DB-Verbindung), und ein
Dead-Man's-Switch für den Restic-Job, damit ein *ausbleibendes* Backup auffällt.

---

## 7. Dokumentation und Rechtliches

Nicht optional, sondern Teil der Migration — hier ändern sich die Auftragsverarbeiter:

- **`/datenschutz`** — Netlify und Cloudflare R2 als Auftragsverarbeiter streichen, netcup
  (Nürnberg, DE) aufnehmen. OpenAI, Cloudflare Workers AI und Resend bleiben drin und müssen
  weiterhin genannt sein. Hosting-Ort wechselt von US-CDN auf ein deutsches Rechenzentrum —
  das ist eine Verbesserung, die dort auch stehen darf.
- **`/impressum`** — Hosting-Angabe auf netcup umstellen, falls dort einer genannt ist.
- **`README.md`** — Deployment-Abschnitt komplett neu (Coolify statt Netlify, GHCR-Pipeline,
  die neuen Cron-Tasks statt der GitHub-Workflows).
- **`.env.example`** — `S3_ENDPOINT` und `S3_REGION` dokumentieren, `CLOUDFLARE_ACCOUNT_ID` vom
  Optional- in den RAG-Pflichtblock verschieben, den Kommentar bei `DATABASE_URL`
  („verbindet über pgBouncer") bestätigen, den R2-Block als „S3-kompatibel (MinIO oder R2)"
  überschreiben.
- **`/tutorial`** — nur prüfen; die Migration ist für Spieler und Spielleitung unsichtbar und
  sollte dort keine Spuren hinterlassen.

**Changelog (`src/lib/changelog.ts`):** Nach der Regel in `AGENTS.md` kommen nur *neue
Features* für Spieler/SL hinein. Eine Infrastrukturmigration ist genau das nicht — der
Changelog-Eintrag dieser Version bleibt also voraussichtlich **leer**, während `version.ts`
und der PR-Body ganz normal pro Commit fortgeschrieben werden. Das ist kein Versehen, sondern
der dokumentierte Normalfall.

---

## 8. Verifikation

**Pro Commit, vor dem Push:** Tests für geänderten Code mitziehen. Konkret betroffen ist
`src/lib/assetStorage.test.ts` (S3-Endpoint-Logik) — dort einen Fall ergänzen, der prüft, dass
bei gesetztem `S3_ENDPOINT` weder `R2_ACCOUNT_ID` verlangt noch der Cloudflare-Endpoint gebaut
wird, und einen, der das bisherige R2-Verhalten ohne `S3_ENDPOINT` festhält. Die Suite selbst
läuft laut `AGENTS.md` nicht lokal, sondern in CI — danach den Run beobachten.

**Build-Verifikation (neu und der wichtigste Punkt):** Weil `next build` heute in keinem
CI-Schritt vorkommt, vor dem ersten echten Deploy einmal lokal
`docker build -t lcars-test . --build-arg NEXT_PUBLIC_BASE_URL=https://neo-archiv.de` laufen
lassen. Schlägt der Build wegen einer fehlenden Variable zur Build-Zeit fehl, ist das genau
der Fund, den man vor dem Cutover haben will und nicht danach.

**Nach Schritt 6 auf der Staging-Subdomain, vor dem DNS-Cutover** — diese Liste komplett
durchgehen, jeder Punkt trifft eine andere migrierte Komponente:

| Prüfung | Was sie absichert |
|---|---|
| `curl https://neu.neo-archiv.de/api/health` → `{"ok":true}` | App ↔ pgBouncer ↔ Postgres |
| Login, Logout, erneutes Login | `SESSION_SECRET`, Cookie-Domain, `src/proxy.ts` |
| Bild in einen Inhalt hochladen, Seite neu laden | MinIO-Schreibpfad + `assets.`-Auslieferung |
| Ein Charakter-Portrait aus dem Bestand anzeigen | Erfolgreiche Bucket-Migration per rclone |
| `/rag`-Abfrage stellen | pgvector-Index **und** OpenAI **und** Workers AI mit neuer `CLOUDFLARE_ACCOUNT_ID` |
| Volltextsuche über `/search` | `search_vector`-GIN-Indizes nach dem pg_restore |
| PDF-Export eines Charakterbogens | `@react-pdf/renderer` im standalone-Image |
| Server Action auslösen (Inhalt speichern) | `serverActions.allowedOrigins` hinter Traefik — der wahrscheinlichste Fehler nach dem Domainwechsel |
| Push-Benachrichtigung auslösen | VAPID-Keys korrekt in der Container-Umgebung |
| Adminpanel → manueller DB-Export | `createR2Client()` gegen MinIO, Path-Style-Adressierung |
| Scheduled Task in Coolify manuell auslösen | Cron-Umzug aus GitHub Actions, `tsx` im Image |
| Testweiser Push auf `master` | CI → GHCR → Webhook → Coolify, Ende-zu-Ende |
| Restic-Snapshot anlegen und in eine leere DB zurückspielen | Das Backup-Konzept selbst |
