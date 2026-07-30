#!/usr/bin/env bash
# Server-seitiges Deploy: baut das App-Image (mit laufender DB, s.u.) und bringt
# den Compose-Stack hoch. Wird von .github/workflows/deploy.yml per SSH
# aufgerufen ODER manuell auf dem Server ausgeführt.
#
# Der Produktions-Build braucht eine erreichbare Datenbank (generateStaticParams
# → DB, siehe Dockerfile). Deshalb: erst Postgres/pgBouncer starten, dann das
# Image mit `docker build --network lcars_net` bauen (so erreicht der Build den
# postgres-Container), dann den Rest hochfahren.
set -euo pipefail

# Repo-Wurzel (dieses Skript liegt in deploy/).
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
	echo "✗ .env fehlt im Repo-Root — Secrets zuerst anlegen (siehe deploy/DEPLOY.md)." >&2
	exit 1
fi

# .env für die Build-Args exportieren.
set -a
# shellcheck disable=SC1091
. ./.env
set +a

APP_IMAGE="${APP_IMAGE:-lcars-archive-app:latest}"
# Für den Build direkt gegen Postgres (nicht pgBouncer) verbinden.
BUILD_DATABASE_URL="${DIRECT_DATABASE_URL:-${DATABASE_URL:?DATABASE_URL fehlt in .env}}"

echo "▶ 1/4 Postgres & pgBouncer starten (legt zugleich das Netz lcars_net an)…"
docker compose up -d postgres pgbouncer

echo "▶ 2/4 Auf Postgres-Health warten…"
for i in $(seq 1 30); do
	if docker compose exec -T postgres pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; then
		echo "  ✓ Postgres bereit."
		break
	fi
	sleep 2
	if [[ "$i" == "30" ]]; then
		echo "✗ Postgres wurde nicht rechtzeitig bereit." >&2
		exit 1
	fi
done

echo "▶ 3/4 App-Image bauen (--network lcars_net, DB erreichbar)…"
DOCKER_BUILDKIT=1 docker build \
	--network lcars_net \
	--build-arg "NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY:-}" \
	--build-arg "NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL:-}" \
	--build-arg "DATABASE_URL=${BUILD_DATABASE_URL}" \
	--target runner \
	-t "${APP_IMAGE}" \
	.

echo "▶ 4/4 Stack hochfahren…"
APP_IMAGE="${APP_IMAGE}" docker compose up -d

echo "▶ Aufräumen: ungenutzte Images entfernen…"
docker image prune -f >/dev/null 2>&1 || true

echo "✓ Deploy abgeschlossen."
