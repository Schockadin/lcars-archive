import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(
        new URL("./tests/integration/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    // Alle Testdateien teilen sich dieselbe Postgres-Instanz (siehe
    // resetDb() in helpers.ts) — parallele Files würden sich beim TRUNCATE
    // gegenseitig die Daten unter den Füßen wegziehen.
    fileParallelism: false,
    setupFiles: ["./tests/integration/setup.ts"],
    // DATABASE_URL kommt bewusst NICHT von hier, sondern aus der echten
    // Prozessumgebung (CI setzt es auf den Postgres-Service-Container) —
    // Vitest mergt `test.env` NACH process.env, ein hier hinterlegter
    // Default würde also einen abweichenden echten Wert stillschweigend
    // überschreiben statt nur als Fallback zu dienen.
    env: {
      SESSION_SECRET: "test-session-secret-not-for-production",
    },
  },
});
