export function exportWorkspace(workspace, { now = () => new Date().toISOString() } = {}) {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: now(),
      app: "trackindexes",
      workspace
    },
    null,
    2
  );
}
