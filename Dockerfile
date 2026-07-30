# syntax=docker/dockerfile:1

# Mehrstufiges Build für das Self-Hosting per Docker Compose (siehe compose.yml
# und deploy/DEPLOY.md). Basis ist Node 24.18.1 (latest LTS „Krypton") — dieselbe
# Version wie in .nvmrc / package.json engines / CI.
#
# WICHTIG — der Produktions-Build braucht eine erreichbare Datenbank: fünf
# Detailseiten (characters/[slug], deren logs, missions/[missionSlug], deren
# logs, archive/[slug]) nutzen generateStaticParams und fragen dafür beim Build
# die DB ab (siehe auch den „Verbindungs-Burst beim Build"-Kommentar in
# src/lib/db.ts). Deshalb wird das Image auf dem Server gebaut, wenn Postgres
# bereits läuft, und `docker build` mit `--network` an das Compose-Netz gehängt
# sowie DATABASE_URL als Build-Arg übergeben (siehe deploy/deploy.sh).

FROM node:24.18.1-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ── Abhängigkeiten (inkl. devDependencies — für Build UND die tsx-Ops-Skripte)
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ── Produktions-Build (erzeugt .next/standalone)
FROM deps AS builder
# NEXT_PUBLIC_* werden zur Build-Zeit in die Client-Bundles inlined und müssen
# daher hier als Build-Arg vorliegen. DATABASE_URL wird nur während `npm run
# build` gebraucht (generateStaticParams, s.o.) und landet NICHT im finalen
# runner-Image (separate Stage).
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_BASE_URL
ARG DATABASE_URL
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY \
    NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL \
    DATABASE_URL=$DATABASE_URL \
    NODE_ENV=production
COPY . .
RUN npm run build

# ── Ops-Image: volle node_modules + Quellcode + tsx, für die Cron-Skripte
# (db:backup, db:backup:cleanup, db:purge-deleted, admin:log-digest). Wird von
# der `ops`-Service-Definition in compose.yml genutzt (docker compose run).
FROM deps AS ops
ENV NODE_ENV=production
COPY . .
CMD ["node", "--version"]

# ── Schlankes Runtime-Image (nur Standalone-Output, keine devDependencies)
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# Nicht als root laufen.
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
