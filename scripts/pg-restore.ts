import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import {
  buildPgRestoreArgs,
  getPgDatabaseLabel,
  getPgDatabaseUrl,
} from "@/lib/pgDump";
import { resolvePgTool } from "./pgTools";

function run(executable: string, args: string[]): Promise<number> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(executable, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("close", (code) => resolveRun(code ?? 1));
  });
}

async function main() {
  const requestedPath = process.argv[2];
  if (!requestedPath) {
    throw new Error(
      'Bitte den Dump-Pfad angeben: npm run db:pg-restore -- "C:\\Pfad\\zum\\backup.dump"',
    );
  }

  const inputPath = resolve(requestedPath);
  await access(inputPath);

  const databaseUrl = getPgDatabaseUrl(process.env);
  const target = getPgDatabaseLabel(databaseUrl);
  console.warn(
    `ACHTUNG: Das Wiederherstellen ersetzt Datenbankobjekte aus dem Dump auf ${target}. ` +
      "Die Aktion ist destruktiv; der aktuelle Stand wird nicht automatisch gesichert.",
  );
  const readline = createInterface({ input: stdin, output: stdout });
  let confirmation: string;
  try {
    confirmation = await readline.question(
      `Zum Fortfahren exakt RESTORE ${target} eingeben: `,
    );
  } finally {
    readline.close();
  }

  if (confirmation !== `RESTORE ${target}`) {
    console.log("Wiederherstellung abgebrochen.");
    return;
  }

  const executable = resolvePgTool("pg_restore");
  console.log(`Dump wird nach ${target} zurückgespielt: ${inputPath}`);
  const exitCode = await run(
    executable,
    buildPgRestoreArgs(databaseUrl, inputPath),
  );
  if (exitCode !== 0) {
    throw new Error(
      `pg_restore wurde mit Exitcode ${exitCode} beendet. Die Transaktion wurde zurückgerollt.`,
    );
  }
  console.log("Wiederherstellung abgeschlossen.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
