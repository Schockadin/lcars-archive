import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { buildPgDumpArgs, getPgDatabaseUrl } from "@/lib/pgDump";
import { resolvePgTool } from "./pgTools";

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function run(executable: string, args: string[]): Promise<number> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(executable, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("close", (code) => resolveRun(code ?? 1));
  });
}

async function main() {
  const databaseUrl = getPgDatabaseUrl(process.env);
  const requestedPath = process.argv[2];
  const outputPath = resolve(
    requestedPath ||
      join(
        homedir(),
        "Documents",
        "Neo-Archiv-Backups",
        `neo-archiv-db-${timestamp()}.dump`,
      ),
  );

  await mkdir(dirname(outputPath), { recursive: true });
  if (existsSync(outputPath)) {
    throw new Error(
      `Die Zieldatei existiert bereits und wird nicht überschrieben: ${outputPath}`,
    );
  }
  const executable = resolvePgTool("pg_dump");
  console.log(`Vollständigen Datenbank-Dump erstellen: ${outputPath}`);

  try {
    const exitCode = await run(
      executable,
      buildPgDumpArgs(databaseUrl, outputPath),
    );
    if (exitCode !== 0) {
      throw new Error(`pg_dump wurde mit Exitcode ${exitCode} beendet.`);
    }

    const file = await stat(outputPath);
    if (file.size === 0)
      throw new Error("pg_dump hat eine leere Datei erzeugt.");
    console.log(
      `Dump gespeichert (${(file.size / 1024 / 1024).toFixed(1)} MB): ${outputPath}`,
    );
  } catch (error) {
    await rm(outputPath, { force: true });
    throw error;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
