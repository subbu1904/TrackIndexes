import { createDashboardScreen } from "./screens/dashboardScreen.js";
import { createEntryScreen } from "./screens/entryScreen.js";
import { createPollController } from "./services/pollController.js";
import { createLocalStore } from "./services/localStore.js";
import { createAutosaveController } from "./services/autosave.js";
import { createAppSession } from "./services/appSession.js";
import { importFromFile } from "./services/importService.js";
import { exportWorkspace } from "./services/exportService.js";
import { createRouter } from "./router.js";

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit"
});

function buildDashboardStatus(workspace) {
  const marketDataMeta = workspace.marketDataMeta ?? {};

  return workspace.lastUpdatedAt
    ? [
        `Updated ${timeFormatter.format(new Date(workspace.lastUpdatedAt))}`,
        marketDataMeta.stale
          ? "Cached market data"
          : workspace.lastQuotes?.some((quote) => quote.isDelayed)
            ? "Delayed market data"
            : "Live market data"
      ].join(" · ")
    : "Loading live market data...";
}

export async function renderApp(root) {
  const router = createRouter(root);
  const store = createLocalStore();
  const session = createAppSession({ store });
  const autosave = createAutosaveController({
    saveImpl: async (workspace) => {
      await store.save(workspace);
    }
  });
  const controller = createPollController();

  let currentWorkspace = null;
  let currentDashboard = null;

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
  }

  async function importFile(file, onSuccess) {
    try {
      const imported = await importFromFile(file);
      const summary = [
        "Replace local workspace with imported backup?",
        imported.exportedAt ? `Exported: ${new Date(imported.exportedAt).toLocaleString("en-IN")}` : "Exported: Unknown",
        `Version: ${imported.workspace.version}`
      ].join("\n");
      const confirmed = globalThis.confirm?.(summary);
      if (confirmed === false) {
        return;
      }

      const nextState = await session.replaceWorkspace(imported.workspace);
      onSuccess(nextState.workspace);
      void controller.start();
    } catch (error) {
      globalThis.alert?.(
        error?.message ?? "The selected backup file could not be imported."
      );
    }
  }

  function downloadBackup(workspace) {
    const json = exportWorkspace(workspace);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `trackindexes-backup-${stamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function showDashboard(workspace) {
    currentWorkspace = workspace;
    applyTheme(workspace.preferences.theme);

    currentDashboard = createDashboardScreen({
      onToggleTheme: async () => {
        currentWorkspace = {
          ...currentWorkspace,
          preferences: {
            ...currentWorkspace.preferences,
            theme: currentWorkspace.preferences.theme === "dark" ? "light" : "dark"
          }
        };
        applyTheme(currentWorkspace.preferences.theme);
        currentDashboard?.setThemeLabel(currentWorkspace.preferences.theme);
        autosave.schedule(currentWorkspace);
      },
      onBackup: async () => {
        downloadBackup(currentWorkspace);
        currentDashboard?.setStatus("Backup downloaded.");
      },
      onImport: async (file) => {
        await importFile(file, (nextWorkspace) => {
          showDashboard(nextWorkspace);
        });
      },
      onAbout: async () => {
        globalThis.alert?.(
          `TrackIndexes v0.1.0\nData from the TrackIndexes market data API cache.\nLive source outages may fall back to cached market data.`
        );
      },
      onRefresh: async () => {
        const didRefresh = await controller.forceRefresh();
        if (!didRefresh) {
          currentDashboard?.setStatus("Already refreshing. Please wait a moment.");
        }
      },
      onReset: async () => {
        const confirmed = globalThis.confirm?.(
          "This will clear all saved progress on this device. Continue?"
        );
        if (confirmed === false) {
          return;
        }

        const nextState = await session.startFresh();
        showDashboard(nextState.workspace);
        void controller.start();
      }
    });

    currentDashboard.setWorkspace(workspace);
    currentDashboard.setThemeLabel(workspace.preferences.theme);
    currentDashboard.setStatus(buildDashboardStatus(workspace));
    router.showScreen(currentDashboard.element);
    history.replaceState({ screen: "dashboard" }, "");

    if (!workspace.lastQuotes?.length) {
      void controller.start();
    }
  }

  async function showEntry(metadata) {
    const entry = createEntryScreen({
      metadata,
      onResume: async () => {
        const nextState = await session.resume();
        showDashboard(nextState.workspace);
        void controller.start();
      },
      onStartFresh: async () => {
        const confirmed = globalThis.confirm?.(
          "This will clear all saved progress on this device. Continue?"
        );
        if (confirmed === false) {
          return;
        }

        const nextState = await session.startFresh();
        showDashboard(nextState.workspace);
        void controller.start();
      },
      onImport: async (file) => {
        await importFile(file, (nextWorkspace) => {
          showDashboard(nextWorkspace);
        });
      }
    });

    router.showScreen(entry);
    history.replaceState({ screen: "entry" }, "");
  }

  controller.subscribe((event) => {
    if (!currentDashboard) {
      return;
    }

    if (event.type === "status") {
      if (event.status === "loading") {
        currentDashboard.setStatus("Loading live market data...");
        currentDashboard.setRefreshEnabled(false);
        currentDashboard.setRefreshVisible(true);
        currentDashboard.setOffline(false);
      }

      if (event.status === "offline") {
        currentDashboard.setStatus(
          currentWorkspace?.lastQuotes?.length
            ? `${buildDashboardStatus(currentWorkspace)} · Offline`
            : "You are offline. Connect to the internet to fetch market data."
        );
        currentDashboard.setRefreshEnabled(false);
        currentDashboard.setRefreshVisible(false);
        currentDashboard.setOffline(true);
      }

      return;
    }

    if (event.type === "error") {
      currentDashboard.setStatus(
        currentWorkspace?.lastQuotes?.length
          ? `${buildDashboardStatus(currentWorkspace)} · Refresh failed`
          : event.error?.message ?? "Market data could not be loaded right now."
      );
      currentDashboard.setRefreshEnabled(true);
      currentDashboard.setRefreshVisible(true);
      if (!currentWorkspace?.lastQuotes?.length) {
        currentDashboard.showError(
          event.error?.message ?? "Couldn't fetch data. Tap to retry."
        );
      }
      return;
    }

    if (event.type === "update") {
      currentWorkspace = {
        ...currentWorkspace,
        lastQuotes: event.quotes,
        lastUpdatedAt: event.lastUpdatedAt,
        marketDataMeta: event.meta
      };
      currentDashboard.setQuotes(event.quotes);
      currentDashboard.setStatus(buildDashboardStatus(currentWorkspace));
      currentDashboard.setRefreshEnabled(true);
      currentDashboard.setRefreshVisible(true);
      currentDashboard.setOffline(false);
      autosave.schedule(currentWorkspace);
    }
  });

  const initialState = await session.bootstrap();

  if (initialState.mode === "entry" && history.state?.screen === "dashboard") {
    const nextState = await session.resume();
    showDashboard(nextState.workspace);
    void controller.start();
    return;
  }

  if (initialState.mode === "entry") {
    await showEntry(initialState.metadata);
    return;
  }

  showDashboard(initialState.workspace);
  void controller.start();
}
