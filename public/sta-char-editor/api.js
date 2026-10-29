const API_ROOT = "/api/sta-char-editor/v1";

async function request(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `Anfrage fehlgeschlagen (${response.status}).`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

export function pullChanges(cursor) {
  return request(`/sync?cursor=${encodeURIComponent(cursor || 0)}`, { method: "GET", headers: {} });
}

export function pushMutations(mutations) {
  return request("/sync", { method: "POST", body: JSON.stringify({ mutations }) });
}

export function getServerModules() {
  return request("/modules", { method: "GET", headers: {} });
}

export function publishModule(pack, scope, activate) {
  return request("/modules", { method: "POST", body: JSON.stringify({ pack, scope, activate }) });
}
