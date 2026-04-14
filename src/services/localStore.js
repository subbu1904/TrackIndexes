const WORKSPACE_KEY = "trackindexes.workspace";
const METADATA_KEY = "trackindexes.metadata";

function createIndexedDbBridge() {
  return {
    async get(key) {
      const db = await openWorkspaceDb();
      return runTransaction(db, "readonly", (store) => store.get(key));
    },
    async set(key, value) {
      const db = await openWorkspaceDb();
      return runTransaction(db, "readwrite", (store) => store.put(value, key));
    },
    async delete(key) {
      const db = await openWorkspaceDb();
      return runTransaction(db, "readwrite", (store) => store.delete(key));
    }
  };
}

function openWorkspaceDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("trackindexes", 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("workspace")) {
        db.createObjectStore("workspace");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runTransaction(db, mode, executor) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("workspace", mode);
    const store = transaction.objectStore("workspace");
    const request = executor(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function createLocalStore({
  workspaceDb = createIndexedDbBridge(),
  metadataStorage = globalThis.localStorage
} = {}) {
  return {
    async save(workspace) {
      await workspaceDb.set(WORKSPACE_KEY, workspace);
      metadataStorage?.setItem(
        METADATA_KEY,
        JSON.stringify({
          hasWorkspace: true,
          lastSaved: workspace.lastUpdatedAt,
          stateVersion: workspace.version
        })
      );
    },
    async load() {
      return (await workspaceDb.get(WORKSPACE_KEY)) ?? null;
    },
    async clear() {
      await workspaceDb.delete(WORKSPACE_KEY);
      metadataStorage?.removeItem(METADATA_KEY);
    },
    readMetadata() {
      const raw = metadataStorage?.getItem(METADATA_KEY);
      if (!raw) {
        return null;
      }

      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
  };
}
