import test from "node:test";
import assert from "node:assert/strict";

import { createAppSession } from "../src/services/appSession.js";

test("bootstrap initializes and saves a fresh workspace when no metadata exists", async () => {
  const saved = [];
  const session = createAppSession({
    store: {
      readMetadata: () => null,
      save: async (workspace) => {
        saved.push(workspace);
      },
      load: async () => null,
      clear: async () => {}
    }
  });

  const state = await session.bootstrap();

  assert.equal(state.mode, "dashboard");
  assert.equal(saved.length, 1);
  assert.deepEqual(state.workspace.lastQuotes, []);
});

test("bootstrap shows the entry decision when resumable metadata exists", async () => {
  const session = createAppSession({
    store: {
      readMetadata: () => ({
        hasWorkspace: true,
        lastSaved: "2026-04-14T08:00:00.000Z",
        stateVersion: 1
      }),
      save: async () => {},
      load: async () => null,
      clear: async () => {}
    }
  });

  const state = await session.bootstrap();

  assert.deepEqual(state, {
    mode: "entry",
    metadata: {
      hasWorkspace: true,
      lastSaved: "2026-04-14T08:00:00.000Z",
      stateVersion: 1
    }
  });
});

test("resume loads the saved workspace and transitions to dashboard mode", async () => {
  const workspace = { version: 1, lastQuotes: [{ symbol: "^NSEI" }] };
  const session = createAppSession({
    store: {
      readMetadata: () => ({ hasWorkspace: true }),
      save: async () => {},
      load: async () => workspace,
      clear: async () => {}
    }
  });

  const state = await session.resume();

  assert.deepEqual(state, {
    mode: "dashboard",
    workspace
  });
});

test("resume recreates and saves a fresh workspace when saved metadata exists but IndexedDB is empty", async () => {
  const saved = [];
  const session = createAppSession({
    store: {
      readMetadata: () => ({ hasWorkspace: true }),
      save: async (workspace) => {
        saved.push(workspace);
      },
      load: async () => null,
      clear: async () => {}
    }
  });

  const state = await session.resume();

  assert.equal(state.mode, "dashboard");
  assert.equal(saved.length, 1);
  assert.deepEqual(state.workspace.lastQuotes, []);
});

test("startFresh clears persisted state before creating a new workspace", async () => {
  let cleared = 0;
  const saved = [];
  const session = createAppSession({
    store: {
      readMetadata: () => ({ hasWorkspace: true }),
      save: async (workspace) => {
        saved.push(workspace);
      },
      load: async () => null,
      clear: async () => {
        cleared += 1;
      }
    }
  });

  const state = await session.startFresh();

  assert.equal(cleared, 1);
  assert.equal(saved.length, 1);
  assert.equal(state.mode, "dashboard");
});

test("replaceWorkspace saves imported workspace and returns dashboard mode", async () => {
  const saved = [];
  const importedWorkspace = {
    version: 1,
    lastUpdatedAt: null,
    preferences: { theme: "light", refreshInterval: 60_000 },
    lastQuotes: [],
    viewConfig: { activeScreen: "dashboard" }
  };

  const session = createAppSession({
    store: {
      readMetadata: () => null,
      save: async (workspace) => {
        saved.push(workspace);
      },
      load: async () => null,
      clear: async () => {}
    }
  });

  const state = await session.replaceWorkspace(importedWorkspace);

  assert.deepEqual(saved, [importedWorkspace]);
  assert.deepEqual(state, {
    mode: "dashboard",
    workspace: importedWorkspace
  });
});
