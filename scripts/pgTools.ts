import { accessSync, constants, existsSync, readdirSync } from "node:fs";
import { delimiter, join } from "node:path";

function isExecutable(path: string): boolean {
  if (!existsSync(path)) return false;
  if (process.platform === "win32") return true;
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function windowsPostgresBinDirs(): string[] {
  if (process.platform !== "win32") return [];
  const roots = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"]]
    .filter((root): root is string => Boolean(root))
    .map((root) => join(root, "PostgreSQL"));
  const directories: string[] = [];

  for (const root of roots) {
    if (!existsSync(root)) continue;
    try {
      const versions = readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
      directories.push(
        ...versions.map((version) => join(root, version, "bin")),
      );
    } catch {
      // Eine nicht lesbare optionale Installationswurzel soll PATH nicht blockieren.
    }
  }
  return directories;
}

export function resolvePgTool(tool: "pg_dump" | "pg_restore"): string {
  const executable = process.platform === "win32" ? `${tool}.exe` : tool;
  const pathDirectories = (process.env.PATH ?? "")
    .split(delimiter)
    .filter(Boolean);
  const candidates = [
    process.env.PG_BIN_DIR ? join(process.env.PG_BIN_DIR, executable) : null,
    ...windowsPostgresBinDirs().map((directory) => join(directory, executable)),
    ...pathDirectories.map((directory) => join(directory, executable)),
  ].filter((candidate): candidate is string => Boolean(candidate));

  const resolved = candidates.find(isExecutable);
  if (resolved) return resolved;

  throw new Error(
    `${tool} wurde nicht gefunden. Installiere die PostgreSQL-Client-Tools oder setze PG_BIN_DIR auf den bin-Ordner (zum Beispiel C:\\Program Files\\PostgreSQL\\18\\bin).`,
  );
}
