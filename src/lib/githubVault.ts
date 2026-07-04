import "server-only";

// Schreibpfad App → Vault (siehe docs/content-creation-strategy.md). Nutzt
// bewusst kein @octokit/rest — die Contents API braucht hier nur GET+PUT/
// DELETE, ein schlanker fetch-Wrapper passt zum bestehenden Minimal-
// Dependency-Stil des Projekts (vgl. scripts/ingest/* ohne DB-ORM).

export class VaultFileExistsError extends Error {
  constructor(path: string) {
    super(`Datei "${path}" existiert im Vault bereits`);
    this.name = "VaultFileExistsError";
  }
}

function vaultConfig() {
  const token = process.env.GITHUB_VAULT_TOKEN;
  const repo = process.env.GITHUB_VAULT_REPO;
  const branch = process.env.GITHUB_VAULT_BRANCH || "main";

  if (!token || !repo) {
    throw new Error(
      "GITHUB_VAULT_TOKEN/GITHUB_VAULT_REPO sind nicht gesetzt",
    );
  }

  return { token, repo, branch };
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function githubFetch(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...init?.headers,
    },
  });
}

// Gemeinsam von commitVaultFile (muss NICHT existieren), updateVaultFile und
// deleteVaultFile (müssen existieren, brauchen die sha fürs PUT/DELETE)
// genutzt. Rückgabe null bei 404 — kein Fehler, die Aufrufer entscheiden
// selbst, ob das ein gültiger Fall ist (commit: ja: anlegen; update/delete:
// nein: Datei nicht am erwarteten Pfad gefunden).
async function getExistingFileSha(
  repo: string,
  branch: string,
  token: string,
  path: string,
): Promise<string | null> {
  const res = await githubFetch(
    `/repos/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`,
    token,
  );
  if (res.status === 404) return null;
  if (res.status !== 200) {
    const body = await res.text();
    throw new Error(
      `GitHub-Fehler beim Prüfen von "${path}" (${res.status}): ${body}`,
    );
  }
  const data = (await res.json()) as { sha: string };
  return data.sha;
}

export async function commitVaultFile(input: {
  path: string;
  content: string;
  message: string;
}): Promise<{ htmlUrl: string; sha: string }> {
  const { token, repo, branch } = vaultConfig();

  const existingSha = await getExistingFileSha(repo, branch, token, input.path);
  if (existingSha != null) {
    throw new VaultFileExistsError(input.path);
  }

  const put = await githubFetch(
    `/repos/${repo}/contents/${encodePath(input.path)}`,
    token,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: input.message,
        content: Buffer.from(input.content, "utf8").toString("base64"),
        branch,
      }),
    },
  );

  if (!put.ok) {
    const body = await put.text();
    throw new Error(
      `GitHub-Commit für "${input.path}" fehlgeschlagen (${put.status}): ${body}`,
    );
  }

  const data = (await put.json()) as {
    content: { sha: string; html_url: string };
  };

  return { htmlUrl: data.content.html_url, sha: data.content.sha };
}

// Aktualisiert eine bestehende Vault-Datei (Dual-Write bei Bearbeitung eines
// Inhalts, siehe updateMissionLogAction). Der konventionelle Pfad
// (Missionen/<mission-slug>/<slug>.md) stimmt nur für Inhalte, die selbst
// über die App committet wurden — ältere, manuell im Vault angelegte
// Dateien können abweichend benannt sein. Wirft dann VaultFileExistsError
// NICHT, sondern einen eigenen Fehler ("nicht gefunden") — der Aufrufer
// behandelt das als Best-Effort-Fehlschlag, nicht als harten Abbruch (die
// DB-Änderung ist zu diesem Zeitpunkt bereits geschrieben).
export async function updateVaultFile(input: {
  path: string;
  content: string;
  message: string;
}): Promise<{ htmlUrl: string; sha: string }> {
  const { token, repo, branch } = vaultConfig();

  const sha = await getExistingFileSha(repo, branch, token, input.path);
  if (sha == null) {
    throw new Error(
      `Vault-Datei "${input.path}" nicht gefunden — Update nicht möglich`,
    );
  }

  const put = await githubFetch(
    `/repos/${repo}/contents/${encodePath(input.path)}`,
    token,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: input.message,
        content: Buffer.from(input.content, "utf8").toString("base64"),
        sha,
        branch,
      }),
    },
  );

  if (!put.ok) {
    const body = await put.text();
    throw new Error(
      `GitHub-Update für "${input.path}" fehlgeschlagen (${put.status}): ${body}`,
    );
  }

  const data = (await put.json()) as {
    content: { sha: string; html_url: string };
  };

  return { htmlUrl: data.content.html_url, sha: data.content.sha };
}

// Best-Effort-Löschung beim Entfernen eines eigenen Mission-Logs (siehe
// deleteMissionLog in src/lib/missions.ts). Gleicher Pfad-Vorbehalt wie bei
// updateVaultFile oben: Datei nicht gefunden → kein Fehler, nur
// { deleted: false }, der DB-Löschung steht das nicht im Weg.
export async function deleteVaultFile(input: {
  path: string;
  message: string;
}): Promise<{ deleted: boolean }> {
  const { token, repo, branch } = vaultConfig();

  const sha = await getExistingFileSha(repo, branch, token, input.path);
  if (sha == null) {
    return { deleted: false };
  }

  const del = await githubFetch(
    `/repos/${repo}/contents/${encodePath(input.path)}`,
    token,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: input.message,
        sha,
        branch,
      }),
    },
  );

  if (!del.ok) {
    const body = await del.text();
    throw new Error(
      `GitHub-Löschung von "${input.path}" fehlgeschlagen (${del.status}): ${body}`,
    );
  }

  return { deleted: true };
}
