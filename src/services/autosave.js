export function createAutosaveController({
  saveImpl,
  delayMs = 2000,
  setTimeoutImpl = setTimeout,
  clearTimeoutImpl = clearTimeout
}) {
  let timeoutId = null;
  let pendingWorkspace = null;

  return {
    schedule(workspace) {
      pendingWorkspace = workspace;

      if (timeoutId !== null) {
        clearTimeoutImpl(timeoutId);
      }

      timeoutId = setTimeoutImpl(async () => {
        const nextWorkspace = pendingWorkspace;
        timeoutId = null;
        await saveImpl(nextWorkspace);
      }, delayMs);
    },
    cancel() {
      if (timeoutId !== null) {
        clearTimeoutImpl(timeoutId);
        timeoutId = null;
      }
    }
  };
}
