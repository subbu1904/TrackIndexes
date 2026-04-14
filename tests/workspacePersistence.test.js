import test from "node:test";
import assert from "node:assert/strict";

import { createWorkspaceState } from "../src/models/workspaceState.js";
import { createLocalStore } from "../src/services/localStore.js";
import { createAutosaveController } from "../src/services/autosave.js";
import { exportWorkspace } from "../src/services/exportService.js";
import { importFromFile, importWorkspaceJson } from "../src/services/importService.js";

test("createWorkspaceState returns the v1 workspace schema", () => {
  const workspace = createWorkspaceState({
    lastQuotes: [{ symbol: "^NSEI", price: 24321.55 }]
  });

  assert.deepEqual(workspace, {
    version: 1,
    lastUpdatedAt: null,
    preferences: {
      theme: "dark",
      refreshInterval: 60_000
    },
    lastQuotes: [{ symbol: "^NSEI", price: 24321.55 }],
    viewConfig: {
      activeScreen: "dashboard"
    }
  });
});

test("localStore saves workspace data and mirrors resumable metadata", async () => {
  const dbState = new Map();
  const metaState = new Map();
  const store = createLocalStore({
    workspaceDb: {
      async get(key) {
        return dbState.get(key);
      },
      async set(key, value) {
        dbState.set(key, value);
      },
      async delete(key) {
        dbState.delete(key);
      }
    },
    metadataStorage: {
      getItem(key) {
        return metaState.get(key) ?? null;
      },
      setItem(key, value) {
        metaState.set(key, value);
      },
      removeItem(key) {
        metaState.delete(key);
      }
    }
  });

  const workspace = createWorkspaceState({
    lastUpdatedAt: "2026-04-14T08:00:00.000Z"
  });

  await store.save(workspace);

  assert.deepEqual(await store.load(), workspace);
  assert.deepEqual(store.readMetadata(), {
    hasWorkspace: true,
    lastSaved: "2026-04-14T08:00:00.000Z",
    stateVersion: 1
  });

  await store.clear();

  assert.equal(await store.load(), null);
  assert.equal(store.readMetadata(), null);
});

test("autosave debounces multiple updates into one save", async () => {
  const scheduled = [];
  const saved = [];

  const autosave = createAutosaveController({
    saveImpl: async (workspace) => {
      saved.push(workspace);
    },
    delayMs: 2000,
    setTimeoutImpl: (callback, delay) => {
      scheduled.push({ callback, delay });
      return scheduled.length;
    },
    clearTimeoutImpl: () => {}
  });

  autosave.schedule({ version: 1, id: "first" });
  autosave.schedule({ version: 1, id: "second" });

  assert.equal(saved.length, 0);
  assert.equal(scheduled.length, 2);
  assert.equal(scheduled.at(-1).delay, 2000);

  await scheduled.at(-1).callback();

  assert.deepEqual(saved, [{ version: 1, id: "second" }]);
});

test("exportWorkspace wraps the workspace in a versioned backup envelope", () => {
  const json = exportWorkspace(
    createWorkspaceState({
      lastUpdatedAt: "2026-04-14T08:00:00.000Z"
    }),
    { now: () => "2026-04-14T09:00:00.000Z" }
  );

  assert.deepEqual(JSON.parse(json), {
    version: 1,
    exportedAt: "2026-04-14T09:00:00.000Z",
    app: "trackindexes",
    workspace: {
      version: 1,
      lastUpdatedAt: "2026-04-14T08:00:00.000Z",
      preferences: {
        theme: "dark",
        refreshInterval: 60_000
      },
      lastQuotes: [],
      viewConfig: {
        activeScreen: "dashboard"
      }
    }
  });
});

test("importWorkspaceJson validates, migrates, and returns a replace payload", () => {
  const imported = importWorkspaceJson(
    JSON.stringify({
      version: 1,
      exportedAt: "2026-04-14T09:00:00.000Z",
      app: "trackindexes",
      workspace: {
        version: 1,
        preferences: {
          theme: "light"
        },
        lastQuotes: [],
        viewConfig: {
          activeScreen: "dashboard"
        }
      }
    })
  );

  assert.deepEqual(imported, {
    exportedAt: "2026-04-14T09:00:00.000Z",
    workspace: {
      version: 1,
      lastUpdatedAt: null,
      preferences: {
        theme: "light",
        refreshInterval: 60_000
      },
      lastQuotes: [],
      viewConfig: {
        activeScreen: "dashboard"
      }
    }
  });
});

test("importWorkspaceJson rejects unsupported app payloads", () => {
  assert.throws(
    () =>
      importWorkspaceJson(
        JSON.stringify({
          version: 1,
          exportedAt: "2026-04-14T09:00:00.000Z",
          app: "another-app",
          workspace: {}
        })
      ),
    {
      name: "ImportValidationError",
      message: "This backup file does not belong to TrackIndexes."
    }
  );
});

test("importWorkspaceJson sanitizes imported strings before returning workspace data", () => {
  const imported = importWorkspaceJson(
    JSON.stringify({
      version: 1,
      exportedAt: "2026-04-14T09:00:00.000Z",
      app: "trackindexes",
      workspace: {
        version: 1,
        preferences: {
          theme: "dark"
        },
        lastQuotes: [
          {
            symbol: "^NSEI<script>",
            name: "NIFTY <img src=x onerror=alert(1)>",
            price: 24321.55,
            change: 10,
            changePercent: 0.1,
            timestamp: "2026-04-14T09:00:00.000Z",
            isDelayed: true
          }
        ],
        viewConfig: {
          activeScreen: "dashboard<script>"
        }
      }
    })
  );

  assert.equal(imported.workspace.lastQuotes[0].symbol, "^NSEI&lt;script&gt;");
  assert.equal(
    imported.workspace.lastQuotes[0].name,
    "NIFTY &lt;img src=x onerror=alert(1)&gt;"
  );
  assert.equal(imported.workspace.viewConfig.activeScreen, "dashboard&lt;script&gt;");
});

test("importFromFile rejects oversized backups before parsing", async () => {
  await assert.rejects(
    () =>
      importFromFile({
        size: 1024 * 1024 + 1,
        text: async () => "{}"
      }),
    {
      name: "ImportValidationError",
      message: "Backup files must be 1 MB or smaller."
    }
  );
});

test("localStore tolerates corrupt metadata instead of throwing on bootstrap checks", async () => {
  const store = createLocalStore({
    workspaceDb: {
      async get() {
        return null;
      },
      async set() {},
      async delete() {}
    },
    metadataStorage: {
      getItem() {
        return "{not-json";
      },
      setItem() {},
      removeItem() {}
    }
  });

  assert.equal(store.readMetadata(), null);
});
