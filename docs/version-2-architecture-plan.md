# Version 2.0: Plan für State Management und ORM

Dieser Plan ist der erste Schritt für die beiden Architekturpunkte. Die Einführung selbst erfolgt nach gesonderter Freigabe. Ausgangspunkt ist Version 1.67.3: Die Anwendung nutzt Next.js Server Components und Server Actions, `postgres.js` mit PgBouncer im Transaction Mode, etwa 80 Module mit direktem SQL-Zugriff und lokale React-Zustände in vielen Client-Komponenten. Datenbankschema und Änderungen liegen derzeit in `scripts/schema.sql` und `scripts/setup-db.ts`.

## 1. State Management

**Entscheidung:** Zustand für gemeinsam genutzten, flüchtigen Clientzustand. Serverseitige Daten, Berechtigungen und Mutationen bleiben in der DAL, Server Components und Server Actions. Ein globaler Store für Nutzer- oder Kampagnendaten würde bei gleichzeitig gerenderten Anfragen Zustände vermischen.

1. Zustände inventarisieren: lokale Formularzustände bleiben bei `useState` beziehungsweise `useActionState`; gemeinsam genutzte UI-Zustände wie Filter, Auswahl und offene Panels werden Kandidaten für Stores. Für jeden Zustand Besitzer, Lebensdauer und Persistenzbedarf festhalten.
2. `zustand` installieren und Store-Factory plus Provider an einer passenden Client-Grenze einführen. Ein Store wird pro Render-Anfrage beziehungsweise Provider-Instanz erzeugt; Server Components lesen oder verändern ihn nicht. Initialwerte kommen als serialisierbare Props vom Server.
3. Einen überschaubaren Pilotbereich migrieren, vorzugsweise den Inhaltsbrowser unter `/user/content`. Aktionen über schmale Selektoren anbinden, damit Filteränderungen nicht den gesamten Bereich neu rendern. URL-Parameter bleiben die Quelle für teilbare Filter, sofern vorhanden.
4. Weitere Bereiche nur bei tatsächlichem geteiltem Zustand migrieren. Lokal gespeicherte Anzeigepräferenzen erst nach Hydration laden, damit Server- und Client-Ausgabe übereinstimmen. Bei Konto- oder Kampagnenwechsel Stores neu initialisieren.
5. Tests für Isolation zweier Store-Instanzen, Initialisierung, Reset und einen betroffenen UI-Ablauf ergänzen. Erfolgskriterium: Kein Zustand eines Nutzers erscheint in einer anderen Anfrage; bestehende Formulare und Navigation verhalten sich gleich.

## 2. ORM

**Entscheidung:** Drizzle ORM über dem bereits eingesetzten `postgres.js`. Drizzle unterstützt den vorhandenen Treiber und die schrittweise Migration von SQL-Abfragen. Die bestehende `prepare: false`-Konfiguration für PgBouncer bleibt erhalten. Eine vollständige Umstellung in einem Schritt wäre bei den vorhandenen Spezialabfragen, Importen und Backup-Transaktionen schwer prüfbar.

1. Schemaaufnahme: `scripts/schema.sql`, reale produktive Struktur und `src/types/db.ts` abgleichen. Tabellen, Beziehungen, Checks, Indizes, Views und JSONB-Felder erfassen; Abweichungen vor der Umstellung bereinigen.
2. Drizzle-Schema als typisierte Abbildung des Ist-Zustands anlegen. Den bestehenden `postgres.js`-Client an Drizzle übergeben, damit nicht zwei unabhängige Pools entstehen. Zunächst keine automatische Schemaänderung in Produktion.
3. Migrationsstrategie festlegen: bisherige idempotente SQL-Initialisierung sauber auf eine versionierte Baseline abbilden; neue Migrationen in CI gegen eine leere und eine bestehende Datenbank prüfen. `push` darf keine produktive Struktur ohne Review ändern.
4. Pilotmodule mit einfachen Lese- und Schreiboperationen migrieren, danach domänenweise. Pro Modul Query-Ergebnisse, Nullwerte, Transaktionen und Performance vergleichen. Komplexes SQL kann als parametrisierte Drizzle-SQL-Abfrage bestehen bleiben, wenn die ORM-Abstraktion keinen Gewinn bringt.
5. Backup/Restore, Suche, Rechteabfragen und große Datenimporte zuletzt migrieren; deren SQL-Semantik ist besonders kritisch. Erst nach vollständiger Umstellung veraltete Query-Typen und direkte `postgres.js`-Aufrufe entfernen.
6. Tests für Migrationspfad, Transaktionen und jede migrierte Domäne ergänzen; nach Push die CI einschließlich DB-Integration beobachten. Erfolgskriterium: Eine reproduzierbare Schemahistorie und typsichere Standardabfragen ohne Verlust der bisherigen PgBouncer-Kompatibilität.

## Reihenfolge und Schnittstellen

Die Dateiverwaltung und Exportverschlüsselung können vor der ORM-Migration auf dem bestehenden DAL aufbauen. Nach ihrer Fertigstellung werden die neuen Tabellen und Abfragen in die ORM-Baseline aufgenommen. Das State Management wird nicht als Datenbankcache eingesetzt; nach Server Actions liefern Revalidation beziehungsweise erneutes Laden die maßgeblichen Daten.

Quellen: [Zustand mit Next.js](https://zustand.docs.pmnd.rs/learn/guides/nextjs), [Drizzle mit bestehendem PostgreSQL](https://orm.drizzle.team/docs/get-started/postgresql-existing), [Drizzle mit postgres.js](https://orm.drizzle.team/docs/get-started-postgresql).
