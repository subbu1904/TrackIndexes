import { createWorkspaceState } from "../models/workspaceState.js";

export function createAppSession({ store }) {
  return {
    async bootstrap() {
      const metadata = store.readMetadata();

      if (metadata?.hasWorkspace) {
        return {
          mode: "entry",
          metadata
        };
      }

      const workspace = createWorkspaceState();
      await store.save(workspace);
      return {
        mode: "dashboard",
        workspace
      };
    },
    async resume() {
      let workspace = await store.load();
      if (!workspace) {
        workspace = createWorkspaceState();
        await store.save(workspace);
      }

      return {
        mode: "dashboard",
        workspace
      };
    },
    async startFresh() {
      await store.clear();
      const workspace = createWorkspaceState();
      await store.save(workspace);
      return {
        mode: "dashboard",
        workspace
      };
    },
    async replaceWorkspace(workspace) {
      await store.save(workspace);
      return {
        mode: "dashboard",
        workspace
      };
    }
  };
}
