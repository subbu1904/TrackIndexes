import { createWorkspaceState } from "../models/workspaceState.js";

export function migrateWorkspaceState(workspace) {
  if (!workspace || typeof workspace !== "object") {
    throw new Error("Workspace payload is invalid.");
  }

  if (workspace.version === 1 || workspace.version == null) {
    return createWorkspaceState(workspace);
  }

  throw new Error("This backup file uses an unsupported workspace version.");
}
