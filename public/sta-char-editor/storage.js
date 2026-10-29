const DB_NAME = "sta-char-editor";
const DB_VERSION = 1;
let databasePromise;

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB-Transaktion abgebrochen."));
  });
}

export function openStore() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const characters = db.createObjectStore("characters", { keyPath: "id" });
      characters.createIndex("updatedAt", "updatedAt");
      const outbox = db.createObjectStore("outbox", { keyPath: "opId" });
      outbox.createIndex("characterId", "characterId");
      outbox.createIndex("status", "status");
      db.createObjectStore("modules", { keyPath: "key" });
      db.createObjectStore("settings", { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
}

export async function allCharacters() {
  const db = await openStore();
  return requestResult(db.transaction("characters").objectStore("characters").getAll());
}

export async function getCharacter(id) {
  const db = await openStore();
  return requestResult(db.transaction("characters").objectStore("characters").get(id));
}

export async function saveCharacter(previous, values, profileUserId = null) {
  const db = await openStore();
  const tx = db.transaction(["characters", "outbox"], "readwrite");
  const done = transactionDone(tx);
  const characters = tx.objectStore("characters");
  const outbox = tx.objectStore("outbox");
  const old = previous?.id ? await requestResult(characters.get(previous.id)) : null;
  const record = {
    ...old,
    id: old?.id || crypto.randomUUID(),
    visibility: values.visibility,
    data: values.data,
    moduleVersions: values.moduleVersions,
    revision: old?.revision || 0,
    localRevision: (old?.localRevision || 0) + 1,
    syncedLocalRevision: old?.syncedLocalRevision || 0,
    ownerUserId: old?.ownerUserId ?? profileUserId ?? null,
    deleted: false,
    conflict: null,
    updatedAt: new Date().toISOString(),
  };

  const queued = (await requestResult(outbox.index("characterId").getAll(record.id)))
    .filter((item) => item.status === "pending")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const mutation = {
    characterId: record.id,
    baseRevision: record.revision || null,
    visibility: record.visibility,
    data: structuredClone(record.data),
    moduleVersions: structuredClone(record.moduleVersions),
    deleted: false,
    localRevision: record.localRevision,
  };
  if (queued.length) {
    const last = queued[queued.length - 1];
    outbox.put({ ...last, mutation });
  } else {
    outbox.put({
      opId: crypto.randomUUID(),
      characterId: record.id,
      status: "pending",
      createdAt: record.updatedAt,
      mutation,
    });
  }
  characters.put(record);
  await done;
  return record;
}

export async function putCharacter(record) {
  const db = await openStore();
  const tx = db.transaction("characters", "readwrite");
  tx.objectStore("characters").put(record);
  await transactionDone(tx);
}

export async function getOutbox() {
  const db = await openStore();
  return requestResult(db.transaction("outbox").objectStore("outbox").getAll());
}

export async function markOutboxInflight(opIds) {
  const db = await openStore();
  const tx = db.transaction("outbox", "readwrite");
  const done = transactionDone(tx);
  const store = tx.objectStore("outbox");
  for (const opId of opIds) {
    const item = await requestResult(store.get(opId));
    if (item?.status === "pending") store.put({ ...item, status: "inflight" });
  }
  await done;
}

export async function resetInflight() {
  const db = await openStore();
  const tx = db.transaction("outbox", "readwrite");
  const done = transactionDone(tx);
  const store = tx.objectStore("outbox");
  const entries = await requestResult(store.getAll());
  for (const item of entries) if (item.status === "inflight") store.put({ ...item, status: "pending" });
  await done;
}

export async function applySyncResult(item, result) {
  const db = await openStore();
  const tx = db.transaction(["characters", "outbox"], "readwrite");
  const done = transactionDone(tx);
  const chars = tx.objectStore("characters");
  const outbox = tx.objectStore("outbox");
  const current = await requestResult(chars.get(item.characterId));
  const pending = (await requestResult(outbox.index("characterId").getAll(item.characterId)))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (result.status === "conflict") {
    if (current) chars.put({ ...current, conflict: result.remote || null });
    outbox.put({ ...item, status: "conflict" });
  } else if (result.status === "forbidden" || result.status === "error") {
    outbox.put({ ...item, status: "forbidden", error: result.error || "Keine Berechtigung zum Speichern." });
    if (current) chars.put({ ...current, syncError: result.error || "Keine Berechtigung zum Speichern." });
  } else if (result.status === "ok") {
    outbox.delete(item.opId);
    if (current) {
      chars.put({
        ...current,
        revision: result.character.revision,
        ownerUserId: result.character.ownerUserId,
        updatedAt: result.character.updatedAt,
        syncedLocalRevision: Math.max(current.syncedLocalRevision || 0, item.mutation.localRevision),
      });
    }
    const next = pending.find((entry) => entry.opId !== item.opId && entry.status === "pending");
    if (next) outbox.put({ ...next, mutation: { ...next.mutation, baseRevision: result.character.revision } });
  } else {
    outbox.put({ ...item, status: "pending" });
  }
  await done;
}

export async function applyRemoteChange(remote) {
  const db = await openStore();
  const tx = db.transaction(["characters", "outbox"], "readwrite");
  const done = transactionDone(tx);
  const chars = tx.objectStore("characters");
  const current = await requestResult(chars.get(remote.id));
  const queued = (await requestResult(tx.objectStore("outbox").index("characterId").getAll(remote.id)))
    .some((item) => item.status !== "done");
  if (!current) {
    chars.put({
      id: remote.id,
      visibility: remote.visibility,
      data: remote.data,
      moduleVersions: remote.moduleVersions,
      revision: remote.revision,
      localRevision: 0,
      syncedLocalRevision: 0,
      ownerUserId: remote.ownerUserId,
      deleted: remote.deleted,
      conflict: null,
      updatedAt: remote.updatedAt,
    });
  } else if (remote.revision > (current.revision || 0)) {
    if (queued || (current.localRevision || 0) > (current.syncedLocalRevision || 0)) {
      chars.put({ ...current, conflict: remote });
    } else {
      chars.put({
        ...current,
        visibility: remote.visibility,
        data: remote.data,
        moduleVersions: remote.moduleVersions,
        revision: remote.revision,
        ownerUserId: remote.ownerUserId,
        deleted: remote.deleted,
        updatedAt: remote.updatedAt,
      });
    }
  }
  await done;
}

export async function saveModule(pack, metadata = {}) {
  const db = await openStore();
  const tx = db.transaction("modules", "readwrite");
  const done = transactionDone(tx);
  const key = `${pack.manifest.id}@${pack.manifest.version}`;
  tx.objectStore("modules").put({
    key,
    pack,
    scope: metadata.scope || "private",
    active: Boolean(metadata.active),
    ownerUserId: metadata.ownerUserId ?? null,
    installedAt: new Date().toISOString(),
  });
  await done;
}

export async function deleteModule(key) {
  const db = await openStore();
  const tx = db.transaction("modules", "readwrite");
  const done = transactionDone(tx);
  tx.objectStore("modules").delete(key);
  await done;
}

export async function allModules() {
  const db = await openStore();
  return requestResult(db.transaction("modules").objectStore("modules").getAll());
}

export async function getSetting(key) {
  const db = await openStore();
  return requestResult(db.transaction("settings").objectStore("settings").get(key)).then((row) => row?.value);
}

export async function setSetting(key, value) {
  const db = await openStore();
  const tx = db.transaction("settings", "readwrite");
  const done = transactionDone(tx);
  tx.objectStore("settings").put({ key, value });
  await done;
}

export async function resolveConflict(characterId, choice) {
  const db = await openStore();
  const tx = db.transaction(["characters", "outbox"], "readwrite");
  const done = transactionDone(tx);
  const chars = tx.objectStore("characters");
  const outbox = tx.objectStore("outbox");
  const current = await requestResult(chars.get(characterId));
  if (!current?.conflict) throw new Error("Der Konflikt ist nicht mehr vorhanden.");
  const remote = current.conflict;
  const pending = await requestResult(outbox.index("characterId").getAll(characterId));
  for (const item of pending) outbox.delete(item.opId);

  if (choice === "remote") {
    chars.put({
      ...current,
      visibility: remote.visibility,
      data: remote.data,
      moduleVersions: remote.moduleVersions,
      revision: remote.revision,
      ownerUserId: remote.ownerUserId,
      deleted: remote.deleted,
      localRevision: current.localRevision + 1,
      syncedLocalRevision: current.localRevision + 1,
      conflict: null,
      updatedAt: remote.updatedAt,
    });
  } else if (choice === "local") {
    const next = { ...current, revision: remote.revision, conflict: null, localRevision: current.localRevision + 1, updatedAt: new Date().toISOString() };
    const mutation = {
      baseRevision: remote.revision,
      visibility: next.visibility,
      data: structuredClone(next.data),
      moduleVersions: structuredClone(next.moduleVersions),
      deleted: next.deleted,
      localRevision: next.localRevision,
    };
    outbox.put({ opId: crypto.randomUUID(), characterId, status: "pending", createdAt: next.updatedAt, mutation });
    chars.put(next);
  } else if (choice === "copy") {
    chars.put({
      ...current,
      visibility: remote.visibility,
      data: remote.data,
      moduleVersions: remote.moduleVersions,
      revision: remote.revision,
      ownerUserId: remote.ownerUserId,
      deleted: remote.deleted,
      localRevision: current.localRevision + 1,
      syncedLocalRevision: current.localRevision + 1,
      conflict: null,
      updatedAt: remote.updatedAt,
    });
    const copy = {
      ...current,
      id: crypto.randomUUID(),
      visibility: "private",
      revision: 0,
      localRevision: 1,
      syncedLocalRevision: 0,
      ownerUserId: null,
      conflict: null,
      deleted: false,
      updatedAt: new Date().toISOString(),
      data: { ...current.data, name: `${current.data.name} (Kopie)` },
    };
    const mutation = {
      baseRevision: null,
      visibility: copy.visibility,
      data: structuredClone(copy.data),
      moduleVersions: structuredClone(copy.moduleVersions),
      deleted: false,
      localRevision: 1,
    };
    chars.put(copy);
    outbox.put({ opId: crypto.randomUUID(), characterId: copy.id, status: "pending", createdAt: copy.updatedAt, mutation });
  }
  await done;
}
