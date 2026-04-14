const DEFAULT_PREFERENCES = {
  theme: "dark",
  refreshInterval: 60_000
};

const DEFAULT_VIEW_CONFIG = {
  activeScreen: "dashboard"
};

export function createWorkspaceState(overrides = {}) {
  const {
    preferences,
    viewConfig,
    lastQuotes,
    lastUpdatedAt = null,
    version = 1,
    ...rest
  } = overrides;

  return {
    version,
    lastUpdatedAt,
    preferences: {
      ...DEFAULT_PREFERENCES,
      ...preferences
    },
    lastQuotes: lastQuotes ?? [],
    viewConfig: {
      ...DEFAULT_VIEW_CONFIG,
      ...viewConfig
    },
    ...rest
  };
}
