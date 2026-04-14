import { migrateWorkspaceState } from "./migrationRunner.js";

export class ImportValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ImportValidationError";
  }
}

export function importWorkspaceJson(rawJson) {
  let parsed;

  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new ImportValidationError("This backup file is not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new ImportValidationError("This backup file is invalid.");
  }

  if (parsed.app !== "trackindexes") {
    throw new ImportValidationError(
      "This backup file does not belong to TrackIndexes."
    );
  }

  if (!("workspace" in parsed)) {
    throw new ImportValidationError("This backup file is missing workspace data.");
  }

  let workspace;
  try {
    workspace = migrateWorkspaceState(parsed.workspace);
  } catch (error) {
    throw new ImportValidationError(error.message);
  }

  return {
    exportedAt: parsed.exportedAt ?? null,
    workspace: sanitizeWorkspace(workspace)
  };
}

export async function importFromFile(file, { maxBytes = 1024 * 1024 } = {}) {
  if (file.size > maxBytes) {
    throw new ImportValidationError("Backup files must be 1 MB or smaller.");
  }

  return importWorkspaceJson(await file.text());
}

function sanitizeWorkspace(workspace) {
  return sanitizeValue(workspace);
}

function sanitizeValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, sanitizeValue(entry)])
    );
  }

  if (typeof value === "string") {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  return value;
}
