import "server-only";

// Schreibpfad App → Vault (siehe docs/content-creation-strategy.md). Nutzt
// bewusst kein @octokit/rest — die Contents API braucht hier nur GET+PUT,
// ein schlanker fetch-Wrapper passt zum bestehenden Minimal-Dependency-Stil
// des Projekts (vgl. scripts/ingest/* ohne DB-ORM).

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

export async function commitVaultFile(input: {
  path: string;
  content: string;
  message: string;
}): Promise<{ htmlUrl: string; sha: string }> {
  const { token, repo, branch } = vaultConfig();
  const encodedPath = input.path
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const existing = await githubFetch(
    `/repos/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`,
    token,
  );
  if (existing.status === 200) {
    throw new VaultFileExistsError(input.path);
  }
  if (existing.status !== 404) {
    const body = await existing.text();
    throw new Error(
      `GitHub-Fehler beim Prüfen von "${input.path}" (${existing.status}): ${body}`,
    );
  }

  const put = await githubFetch(`/repos/${repo}/contents/${encodedPath}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: input.message,
      content: Buffer.from(input.content, "utf8").toString("base64"),
      branch,
    }),
  });

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
