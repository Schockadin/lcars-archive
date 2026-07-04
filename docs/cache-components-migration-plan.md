# Plan: Cache Components (`'use cache'`) statt `force-dynamic` für die Sichtbarkeits-Guards

Status: Design-Dokument für ein eigenständiges, zukünftiges Vorhaben. Nichts hiervon ist
umgesetzt.

## Ausgangslage

Die vier Detailseiten mit Sichtbarkeits-Guard (`archive/[slug]`, `characters/[slug]`,
`characters/[slug]/logs`, `missions/[missionSlug]/[logSlug]`) laufen seit dem
Sichtbarkeits-Flag-PR vollständig dynamisch (`export const dynamic = "force-dynamic"`),
weil bedingter `cookies()`-Zugriff auf einer Route mit `generateStaticParams` in Next 16
entweder zu einem harten `DYNAMIC_SERVER_USAGE`-Fehler (Production-Build) oder — im
Dev-Server — zu einem unbemerkt ausgelieferten, veralteten ISR-Cache-Eintrag führt (mit
Playwright gegen einen echten `next build && next start` verifiziert). Das kostet die
statische Vorrenderung dieser vier Routen auch für ihren häufigsten Fall: **public**-Inhalte.

Kern-Erkenntnis aus der Diskussion: `visibility` und `owner_user_id`/`player_id` sind
**Content-Fakten** (ändern sich selten, nur wenn der Owner sie explizit umstellt) — nur der
Abgleich "ist DIESER Betrachter der Owner / ein GM?" ist wirklich viewer-abhängig und
braucht das Session-Cookie. Aktuell sitzen beide Prüfungen in derselben Funktion, wodurch
die ganze Seite als dynamisch gilt, obwohl der weit überwiegende Teil (public-Inhalte)
eigentlich cachebar wäre.

## Warum nicht Middleware/Proxy

Naheliegende Idee: Sichtbarkeit/Owner zur Build-Zeit "backen" und in Middleware statt gegen
die DB zu prüfen, mit ISR aktualisierbar. Funktioniert in diesem Next 16 nicht:
Middleware wurde in **Proxy** umbenannt (deprecated) und läuft laut Doku bewusst
*"invoked separately of your render code [...] you should not attempt relying on shared
modules or globals"* — Proxy hat keinen Zugriff auf Next's Data Cache/`revalidateTag`, den
ISR nutzt. Ein dort gebackenes Manifest friert bis zum nächsten Deploy ein; Proxy müsste
sonst selbst live gegen die DB prüfen (kein Gewinn) oder per `fetch()` einen eigenen,
separat cachebaren Route Handler aufrufen (viel Umweg für wenig Nutzen).

Die von Next 16 dafür vorgesehene Antwort ist **Cache Components** (`cacheComponents: true`
+ `'use cache'` + `cacheTag`/`cacheLife` + Suspense) — architektonisch exakt das Modell
"Content-Fakt cachen, Viewer-Abgleich dynamisch daneben", nur innerhalb der Render-Pipeline
statt in Proxy, wo `revalidateTag` tatsächlich greift.

## Der Ansatz

1. `cacheComponents: true` in `next.config.ts` — App-weiter Schalter, ersetzt
   `dynamic`/`revalidate`/`fetchCache` durch `'use cache'`/`cacheLife`. **Alle Seiten sind
   danach standardmäßig dynamisch**; Caching ist explizit statt implizit.
2. Für jede der vier Guard-Seiten: Aufsplitten in
   - eine `'use cache'`-Funktion/Komponente, die die Zeile lädt (`cacheTag(cacheTags.character(slug))`
     o.ä. — **dieselben Tag-Strings wie heute**, damit `revalidateCharacter`/
     `revalidateArchiveEntry`/`revalidateLog` unverändert weiter funktionieren) und bei
     `visibility === 'public'` den Inhalt direkt zurückgibt/rendert (cacheable, Teil des
     statischen Shells);
   - eine **ungecachte**, mit `<Suspense>` umschlossene Kindkomponente, die nur betreten
     wird, wenn `visibility !== 'public'` — sie liest `cookies()` (`getViewer()`) und
     entscheidet per `canView()`.
3. `export const dynamic = "force-dynamic"` entfällt (laut Migrations-Guide "not needed"
   unter Cache Components).

Beispielhaft für `characters/[slug]/page.tsx` (illustrativ, keine 1:1-Kopiervorlage):

```tsx
async function CachedCharacter({ slug }: { slug: string }) {
  "use cache";
  cacheTag(cacheTags.characters, cacheTags.character(slug));
  const character = await getCharacterBySlug(slug);
  if (!character) notFound();
  if (character.visibility === "public") {
    return <CharacterContent character={character} />;
  }
  return (
    <Suspense fallback={<CharacterSkeleton />}>
      <GuardedCharacter character={character} />
    </Suspense>
  );
}

async function GuardedCharacter({ character }: { character: Character }) {
  const viewer = await getViewer(); // liest cookies() — bewusst nicht "use cache"
  if (!canView(character.visibility, character.player_id, viewer)) notFound();
  return <CharacterContent character={character} />;
}
```

## Betroffener Umfang (App-weit, nicht auf 4 Dateien beschränkt)

`cacheComponents: true` verlangt laut Migrations-Guide, jede bestehende `unstable_cache()`-
Stelle zu überprüfen/umzuschreiben, sonst geht das heutige Cache-Verhalten verloren. Aktuell
betroffen:

| Datei | Funktionen mit `unstable_cache` |
|---|---|
| `src/lib/archive.ts` | `getAllArchiveEntries`, `getArchiveEntryBySlug`, `getDialogueCountByParticipant`, `getAllArchivePaths` |
| `src/lib/characters.ts` | `getAllCharacters`, `getAllCharactersForAdmin`, `getCharacterBySlug`, `getActiveCharacters`, `getLogsByCharacter` |
| `src/lib/missions.ts` | `getAllMissions`, `getMissionBySlug`, `getLogsByMissionId`, `getLogBySlug`, `getAuthorLogNav`, `getAllLogPaths` |
| `src/lib/timeline.ts` | `getAllTimelineEvents` |
| `src/lib/stats.ts` | `getDBStats` |

Zusätzlich alle Stellen mit `export const dynamic = "force-dynamic"` (entfällt unter Cache
Components): die vier Guard-Seiten, `dialogues/[slug]/page.tsx`, `search/page.tsx`, sowie
die API-Routen `api/health`, `api/revalidate`, `api/search`, `api/session` (dort vermutlich
unkritisch, da Route Handler ohnehin nicht Teil des HTML-Prerenderings sind — trotzdem zu
prüfen).

## Migrationsschritte

1. Eigener Branch, `cacheComponents: true` in `next.config.ts` setzen, `npm run build`
   laufen lassen — Next meldet jede Stelle mit unzulässigem dynamischem Zugriff außerhalb
   einer `<Suspense>`-Grenze als Build-Fehler (kein stilles Fehlverhalten wie beim
   `force-dynamic`-Workaround).
2. Jede der fünf Lib-Dateien: `unstable_cache(fn, key, { tags })` → `'use cache'` +
   `cacheTag(...tags)` + passendes `cacheLife(...)` (Standard-Profil reicht meist, ggf.
   `'max'` für selten wechselnde Daten wie Charaktere). Tag-Strings unverändert lassen,
   damit `src/lib/revalidate.ts` nicht angefasst werden muss.
3. Die vier Guard-Seiten nach obigem Muster aufsplitten (cachebare Public-Variante +
   Suspense-umschlossene Owner/GM-Prüfung). `export const dynamic = "force-dynamic"`
   entfernen.
4. `dialogues/[slug]/page.tsx` und `search/page.tsx` einzeln prüfen, ob/wie sie von
   Cache Components profitieren oder unverändert `force-dynamic`-artig bleiben sollen
   (Dialoge sind ohnehin komplett viewer-abhängig — dort bringt Aufsplitten wenig).
5. `generateStaticParams` an den vier Guard-Seiten: prüfen, ob es unter Cache Components
   wieder sinnvoll genutzt werden kann (Vorschlag: `getAllArchivePaths`/`getAllCharacters`/
   `getAllLogPaths` weiterhin nur public-Slugs liefern lassen, für alles andere
   `dynamicParams` griffen lassen).
6. Neues React-Verhalten beachten: Cache Components aktiviert `<Activity>`-basierte
   Navigation (Komponentenstatus bleibt beim Zurücknavigieren erhalten). Laut Next-Doku
   können UI-Muster wie offene Dropdowns/Dialoge sich dadurch anders verhalten — betroffene
   Client-Components in diesem Projekt (z.B. `FollowButtons`, `HeaderSearch`,
   `VisibilitySelect`) einzeln gegenprüfen.

## Risiken

- **App-weiter Umbau, kein isolierter Change.** Jede der 17 `unstable_cache`-Stellen plus
  alle `force-dynamic`-Routen sind betroffen — entsprechend groß der Testaufwand.
- **Next-16-Spezifikum in einem als "abweichend" markierten Fork** (siehe `AGENTS.md`):
  Dokumentierte Beispiele/Verhalten sollten vor Einsatz gegen die tatsächliche
  Implementierung dieses Projekts verifiziert werden, nicht blind übernommen werden.
- **Kein Zurück ohne Weiteres:** ein späteres Downgrade von Next oder das Deaktivieren von
  `cacheComponents` erfordert, alle `'use cache'`-Stellen wieder zurückzubauen.

## Verifikationsplan

Wie beim ursprünglichen Sichtbarkeits-Guard: gegen eine echte, lokale Postgres-Instanz mit
`next build && next start` (nicht nur `next dev`, dessen Turbopack-Cache in der letzten
Verifikation ein falsches Bild gab) testen, plus Playwright-Skript, das für alle vier
Guard-Seiten die Matrix **public/private/gm × Owner/GM/anderer User/anonym** durchspielt
(siehe Vorgehen im vorherigen PR). Zusätzlich: Build-Output (`○`/`●`/`ƒ`-Kennzeichnung)
prüfen, ob public-Inhalte wieder als prerendered erscheinen.

## Empfohlenes Vorgehen

Als eigener PR, getrennt von Feature-Arbeit, mit obigem Schritt-für-Schritt-Vorgehen und
vollständiger Playwright-Verifikation vor dem Merge. `cacheComponents` bleibt bis zum
Abschluss der Verifikation aus (kein Teil-Rollout).
