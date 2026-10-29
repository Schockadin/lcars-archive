# STA Character Editor

The standalone character editor is served from `/sta-char-editor/` as a static PWA. Its source lives in the `Schockadin/StaCharEditor` repository; the generated static files are copied into `public/sta-char-editor/` for the LCARS build. The editor uses the existing LCARS origin, login cookie and PostgreSQL database.

## Release / local deployment

1. In the StaCharEditor checkout, build the static app into the LCARS public directory:

   ```powershell
   npm run build:lcars -- --target E:\dev\lcars-archive\public\sta-char-editor
   ```

2. Apply the idempotent database migration before deploying the LCARS API:

   ```sh
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/migrate-sta-char-editor.sql
   ```

3. Deploy LCARS. The editor is available at `/sta-char-editor/`; its API is under `/api/sta-char-editor/v1/`.

The app must be opened from the LCARS HTTPS origin (or localhost for development) for install and service-worker support. Direct local-file opening is not a PWA install path.

## Offline and conflict behavior

Character data and module packs are stored in the browser's IndexedDB. The editor keeps an outbox, automatically pulls/pushes when online, and never caches API responses. Sync mutations carry a UUID operation ID; PostgreSQL stores the response so retrying an interrupted request is idempotent. Each character revision increases monotonically. A stale base revision produces a conflict with both local and server versions; the user can keep local, use the server copy or retain both as separate characters.

Existing LCARS `characters` records and public character APIs are separate and are not changed by this editor. Private editor characters are visible only to their owner. Campaign characters are readable by non-guest LCARS users; only their owner or GM/admin can write them. Campaign modules are readable by campaign members and can be published/activated only by GM/admin. User modules are private to their account.

## Declarative modules

Module JSON uses `manifest.schemaVersion: 1`, a lowercase namespaced `manifest.id`, a semantic version and a title. Optional `attributes`, `disciplines`, `species`, `professions` and `classes` arrays feed the editor's lists. `characterFields` can add text, number, multiline or select fields; values are stored using a module-qualified key so fields from different packs do not collide. `creationRules.methods` accepts `points` and/or `ap`; `defaultMethod` selects the initial editor choice. The base pack includes the STA 2e 56/16 point budgets, 320/320 AP budgets, distribution limits and free value/talent/focus counts. The editor calculates current spending and flags rule violations from the selected pack. The Technomage sample is available at `modules/example-technomage.json` in the editor source. Module versions are immutable after publication, so publish changes as a new version. The server rejects executable/script fields.
