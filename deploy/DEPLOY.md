# Self-Hosting-Deployment (Netcup, Docker Compose)

Runbook für den Betrieb von **Neo Archive** auf einem eigenen EU-vServer
(Netcup) mit **App + PostgreSQL gemeinsam** auf einem Host. Ersetzt das bisherige
Setup (App auf Netlify, DB auf Railway). **Cloudflare R2** (Bilder + Backups),
**Resend** (Mail) und **Web Push** bleiben unverändert.

## Architektur

Ein Docker-Compose-Stack (`compose.yml`), nur Caddy ist nach außen erreichbar:

- **caddy** — Reverse-Proxy + automatisches Let's-Encrypt-TLS (80/443).
- **app** — Next.js (Standalone, Node 24), intern auf 3000.
- **pgbouncer** — Transaction-Mode-Pooler; die App verbindet hierüber
  (`src/lib/db.ts` bleibt unverändert: `prepare:false`, `ssl:false`).
- **postgres** — PostgreSQL 16, Daten im Volume `pgdata`, **nicht** gepublished.
- **ops** — Nur auf Abruf (Profil `ops`), für die Cron-Skripte.

> Der Produktions-Build braucht eine erreichbare DB (fünf Seiten nutzen
> `generateStaticParams`). Deshalb wird das App-Image **auf dem Server** gebaut,
> während Postgres läuft (`deploy/deploy.sh` hängt `docker build` per
> `--network lcars_net` ans Compose-Netz). Das CI baut das Image bewusst nicht.

---

## 1. Server vorbereiten (einmalig)

Netcup **Root-Server (RS-Linie, dedizierte vCPUs)**, ~4 Kerne / 8–16 GB / NVMe,
**Ubuntu 24.04 LTS** über das Netcup-SCP installieren. DSGVO: AV-Vertrag bei
Netcup abschließen.

```bash
# als root
adduser deploy && usermod -aG sudo deploy
# SSH-Public-Key des Deploy-Users in /home/deploy/.ssh/authorized_keys ablegen
# /etc/ssh/sshd_config: PasswordAuthentication no, PermitRootLogin no → sshd neu laden
timedatectl set-timezone Europe/Berlin

apt-get update && apt-get install -y ca-certificates curl git ufw fail2ban
# Docker Engine + Compose-Plugin (offizielle Anleitung docs.docker.com)
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy

ufw default deny incoming && ufw default allow outgoing
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable
systemctl enable --now fail2ban
# Automatische Sicherheitsupdates
apt-get install -y unattended-upgrades && dpkg-reconfigure -plow unattended-upgrades
```

## 2. Repo & Secrets

```bash
sudo mkdir -p /opt/lcars-archive && sudo chown deploy:deploy /opt/lcars-archive
# als deploy — Read-only Deploy-Key des Repos in GitHub hinterlegen
git clone git@github.com:Schockadin/lcars-archive.git /opt/lcars-archive
cd /opt/lcars-archive
cp deploy/.env.server.example .env
# .env mit echten Werten füllen (Postgres-Passwort, Secrets, R2, Resend, VAPID …)
chmod 600 .env
```

## 3a. Erst-Deploy (frische DB, ohne Datenübernahme)

```bash
cd /opt/lcars-archive
./deploy/deploy.sh
# Schema entsteht beim ersten Postgres-Start automatisch (scripts/schema.sql).
# Ersten Admin anlegen:
docker compose --profile ops run --rm ops npm run db:create-admin
```

## 3b. Datenmigration aus der bestehenden DB (Railway → Server)

R2 bleibt unangetastet (Bilder/Backups referenzieren dieselben Keys weiter).

```bash
# 1) Auf einem Rechner mit Zugriff auf die Railway-DB einen Voll-Dump ziehen
#    (DIRECT/öffentliche Connection-URL der Railway-DB):
pg_dump -Fc --no-owner --no-privileges "$RAILWAY_DIRECT_URL" -f lcars.dump

# 2) Dump auf den Server kopieren
scp lcars.dump deploy@<server>:/opt/lcars-archive/

# 3) Auf dem Server: Postgres/pgBouncer starten, dann restoren
cd /opt/lcars-archive
docker compose up -d postgres pgbouncer
docker compose cp lcars.dump postgres:/tmp/lcars.dump
docker compose exec postgres pg_restore --clean --if-exists --no-owner \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" /tmp/lcars.dump

# 4) Rest hochfahren
./deploy/deploy.sh
```

> **Fallback**: Statt `pg_dump`/`pg_restore` funktioniert auch der vorhandene
> JSON-Voll-Restore im Adminpanel (`/admin/db` → „Backup einspielen") gegen die
> frisch mit Schema initialisierte Container-DB.

**Verifikation:** Zeilen-Counts vergleichen, Login testen, einen Inhalt samt
R2-Bild öffnen:
```bash
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "select 'users', count(*) from users union all select 'characters', count(*) from characters;"
```

## 4. Auto-Deploy (GitHub Actions)

Repository-Secrets setzen (Settings → Secrets and variables → Actions):
`DEPLOY_SSH_HOST`, `DEPLOY_SSH_USER` (= `deploy`), `DEPLOY_SSH_KEY` (privater
Key, dessen Public-Key in `authorized_keys` des Deploy-Users liegt).

Ablauf: Push auf `master` → `CI` (lint/test/e2e) → bei Erfolg `Deploy`
(`.github/workflows/deploy.yml`) → SSH → `git pull` + `./deploy/deploy.sh`.

## 5. Cron auf den Server holen

```bash
sudo touch /var/log/lcars-cron.log && sudo chown deploy:deploy /var/log/lcars-cron.log
crontab deploy/cron/lcars.crontab   # täglich 03:00 Backup/Purge, 06:00 Log-Digest
```
Danach die GitHub-Actions-Cronjobs abschalten (Schedule in
`daily-db-backup.yml` und `admin-log-digest.yml` auskommentieren) — sie können
die nun interne DB ohnehin nicht mehr erreichen.

## 6. DNS-/TLS-Cutover

1. Vorab TTL des `neo-archiv.de`-Records senken.
2. `A`/`AAAA` von Netlify auf die Netcup-Server-IP (v4+v6) umstellen.
3. Caddy holt automatisch das Let's-Encrypt-Zertifikat (Port 80/443 offen).
4. Prüfen: `curl -I https://neo-archiv.de` (200 + gültiges Zertifikat), Login,
   Bild-Upload, Push, Mailversand. UptimeRobot grün.
5. Erst **danach** Netlify + Railway abschalten.

**Rollback:** `A`/`AAAA` zurück auf Netlify (Railway blieb bis dahin unberührt).

---

## Betrieb

```bash
docker compose ps                     # Status
docker compose logs -f app            # App-Logs
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

# Manuelles Voll-Backup nach R2 (identisch zum Cron):
docker compose --profile ops run --rm ops npm run db:backup

# Off-site-Roh-Backup des DB-Files (ergänzend zum JSON-Backup):
docker compose exec postgres pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB" > db-$(date +%F).dump
```

Updates laufen normal über Push auf `master` (Auto-Deploy). Manuell:
`cd /opt/lcars-archive && git pull && ./deploy/deploy.sh`.
