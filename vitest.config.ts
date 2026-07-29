import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    // Next behandelt den bloßen "server-only"-Import speziell; unter Vitest
    // würde er werfen, sobald ein Client-Component-Test transitiv (z.B. über
    // den @/components/lcars-Barrel) ein Modul zieht, das "server-only"
    // importiert. Auf denselben No-op-Stub wie die Integrationskonfiguration
    // aliasen, damit reine UI-Tests solche Barrels importieren können.
    alias: {
      "server-only": fileURLToPath(
        new URL("./tests/integration/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
