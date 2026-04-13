import type { SessionMetadata } from '../preferences/types';

/**
 * StartupMode — the three patterns supported by LoginFreePersist.md.
 * The active mode is determined by `resolveStartupMode()` below.
 *
 * Per RevisedBuildPlan.md §G: support all three patterns; defer actual
 * choice to LoginFreePersist.md rather than baking in one UX.
 */
export type StartupMode =
  | 'fresh'          // No saved state; initialize with defaults
  | 'silent_resume'  // Saved state exists; restore without prompting
  | 'prompt_resume'; // Saved state exists; show Resume/Start Afresh prompt

/**
 * Policy configuration — change this constant to switch behavior.
 *
 * Per LoginFreePersist.md §Proposed UX / Returning visit:
 *   "If local saved state exists, show a lightweight decision screen."
 * → default policy is 'prompt_resume'.
 *
 * To switch to silent restore (no prompt), change to 'silent_resume'.
 */
const RESUME_POLICY: 'silent_resume' | 'prompt_resume' = 'prompt_resume';

/**
 * Determine the startup mode based on session metadata and the configured policy.
 * Per RevisedBuildPlan.md §C: expose `resolveStartupMode()` as an explicit boundary.
 */
export function resolveStartupMode(metadata: SessionMetadata | null): StartupMode {
  if (!metadata || !metadata.workspaceExists) {
    return 'fresh';
  }
  return RESUME_POLICY;
}
