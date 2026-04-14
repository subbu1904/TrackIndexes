# Design Note: Login-Free Persistence with Local Resume and Optional File Import/Export

## Summary

We want users to return to the app without requiring login, while still giving them a reliable way to preserve progress, move between devices, and recover from data loss.

The proposed approach is a hybrid model:

- **Automatic local resume** on the same device using browser storage.
- **Optional file export/import** for backup and cross-device transfer.
- A clear entry choice on return: **Resume** or **Start afresh**.

This keeps the core experience frictionless while still giving users control over their data.

---

## Problem

We want persistence without introducing accounts, passwords, or mandatory authentication.

A pure file-based model is workable, but it creates repeated friction because users must manage and upload a file every time they return. A pure browser-storage model is smoother, but it is fragile because data can be lost if the user clears storage, changes devices, or reinstalls the app.

We therefore need a model that:

- feels login-free
- resumes seamlessly on the same device
- offers backup and portability
- is understandable to users
- avoids treating client-managed state as trusted authority

---

## Goals

- No login required for core usage.
- Return users on the same device can continue immediately.
- Users can choose to discard prior progress and start fresh.
- Users can export their state to a file for backup or transfer.
- Users can import a previously exported file to restore state.
- The design remains simple enough for users to understand.

## Non-goals

- Cross-device automatic sync.
- Real identity, account recovery, or multi-user access.
- Secure server-side enforcement of roles, entitlements, or billing state via the exported file.
- Collaboration across multiple users.

---

## Proposed UX

### First visit

On first visit:

- initialize empty application state
- store it locally in browser storage
- begin autosaving during the session

The user does not need to create an account or upload anything.

### Returning visit on same device

If local saved state exists, show a lightweight decision screen:

- **Resume where I left off**
- **Start afresh**
- optional secondary action: **Import from file**

This makes the app’s behavior explicit and prevents accidental continuation of stale work.

### During use

The app autosaves locally as state changes.

The UI should also provide:

- **Download backup** or **Export state**
- **Import state file**
- **Reset / Start afresh**

### New device or recovery flow

If no local state exists, the user starts fresh by default, but can optionally import a previously exported file to continue.

---

## Why this approach

This hybrid model is preferred because it combines low friction with portability.

### Benefits

- Same-device return feels seamless.
- Users are not forced into account creation.
- Exported files give users a sense of ownership and control.
- Recovery and transfer are possible without backend identity.
- Implementation complexity is moderate.

### Tradeoffs

- Resume is device-local unless the user exports and imports.
- Users may lose data if they never export and local storage is cleared.
- Imported files must be validated and migrated across app versions.
- Sensitive data should not be stored casually in exports unless protected.

---

## State model

The app should treat persisted state as **user workspace state**, not as trusted security authority.

Examples of suitable persisted state:

- current workflow step
- draft content
- preferences
- local history
- selected options
- view configuration

Examples of state that should **not** be trusted from a user-managed file:

- admin status
- subscription entitlement
- usage quota enforcement
- server-trusted permissions
- anti-abuse counters

---

## Storage strategy

### Local storage layer

Use a local persistence mechanism such as:

- `IndexedDB` for larger or structured state
- `localStorage` for lightweight state or metadata

Recommended split:

- store the full workspace in `IndexedDB`
- store a small metadata record in `localStorage` for fast detection of resumable state

Example metadata:

- workspace exists
- last updated timestamp
- app state version
- display name for the workspace, if relevant

### Export format

Use a versioned JSON file for export.

Example:

```json
{
  "version": 3,
  "exportedAt": "2026-04-11T10:30:00Z",
  "app": "my-app",
  "workspace": {
    "currentStep": "review",
    "drafts": {
      "main": "Example content"
    },
    "preferences": {
      "theme": "dark"
    }
  }
}
```

The export should include:

- schema version
- timestamp
- app identifier
- the minimum workspace state needed to restore the session

Optional additions:

- checksum
- signature for tamper detection
- compression for larger files
- encryption if the content is sensitive

---

## Resume or start afresh decision

This choice is an important part of the UX.

### Why it helps

- avoids surprising users by reopening old work automatically
- prevents confusion when multiple people share a device
- makes state continuity visible and understandable
- offers an easy reset path without hunting through settings

### Suggested copy

**We found saved progress on this device.**

- **Resume**: Continue from where you left off.
- **Start afresh**: Clear saved progress on this device and begin a new session.
- **Import from file**: Restore progress from a backup file.

### Suggested behavior

- default primary action: **Resume**
- destructive action: **Start afresh** should require confirmation if meaningful work exists
- optional detail text: show last saved time

Example:

> Last saved on April 11, 2026 at 3:40 PM.

---

## Import/export behavior

### Export

Export should be:

- manually triggered
- clearly named
- easy to redownload after major milestones

Suggested filenames:

- `my-app-workspace-2026-04-11.json`
- `project-backup-2026-04-11.json`

### Import

On import:

1. parse file
2. validate schema
3. check app identifier
4. run version migrations if needed
5. preview what will be restored, if useful
6. replace or merge local workspace depending on chosen policy

Recommended default policy:

- imported state **replaces** current local workspace after confirmation

This is simpler and less error-prone than merge.

---

## Data validation and migration

Because exported files may outlive the current app version, the file format must be versioned.

### Validation requirements

- file must be valid JSON
- top-level fields must exist
- version must be recognized or migratable
- required workspace fields must match expected types
- invalid or corrupted data must fail gracefully

### Migration strategy

Maintain explicit migration functions from older versions to the current version.

Example approach:

```ts
function migrateState(data: any) {
  let state = data;

  if (state.version === 1) {
    state.workspace.preferences = { theme: "light" };
    state.version = 2;
  }

  if (state.version === 2) {
    state.workspace.drafts = state.workspace.drafts || {};
    state.version = 3;
  }

  return state;
}
```

If migration is impossible, the app should explain that the file is from an unsupported version.

---

## Security and trust model

This design is intentionally login-free, so user-managed persistence should be treated as untrusted input.

### Security principles

- never trust imported files for authorization decisions
- validate all imported data
- sanitize any user-controlled content before rendering
- assume imported files may be edited, malformed, or malicious

### Sensitive data

If the exported state may contain private or sensitive information, consider:

- warning users before export
- minimizing exported content
- offering passphrase-based encryption

Encryption is useful for privacy, but it adds UX complexity. It should only be added if the data truly warrants it.

---

## Failure modes and recovery

Potential failure cases:

- local storage cleared by browser or user
- file missing or outdated
- corrupted export
- unsupported export version
- user accidentally starts fresh

Mitigations:

- autosave locally on meaningful changes
- encourage export at important milestones
- show last saved timestamp
- confirm destructive reset actions
- validate imports with clear error messages
- consider a temporary undo window for reset, if feasible

---

## Technical outline

### Core components

- in-memory app state store
- local persistence adapter
- export serializer
- import parser and validator
- migration layer
- entry decision screen for resume/start fresh/import

### Save lifecycle

1. user interacts with app
2. state updates in memory
3. state is debounced and written to local persistence
4. metadata is updated with timestamp/version
5. optional manual export creates downloadable JSON file

### Load lifecycle

1. app starts
2. app checks for resumable local metadata
3. if none exists, start new workspace
4. if state exists, show resume/start fresh/import options
5. on resume, load and hydrate current local workspace
6. on import, validate and migrate file, then replace workspace

---

## UX recommendations

- Keep the messaging simple: “saved on this device” is easier to understand than “browser persistence.”
- Make export/import visible but secondary.
- Show when progress was last saved.
- Use plain language for destructive actions.
- Avoid forcing file management unless the user is transferring devices or restoring from backup.

Suggested labels:

- Resume
- Start afresh
- Import from file
- Download backup
- Reset saved progress

---

## Open questions

- Should import replace local state or create a second named workspace?
- Do we need multiple local workspaces, or only one active session?
- Is the persisted state small enough for JSON, or should we compress it?
- Does the exported file contain anything sensitive enough to justify encryption?
- Should we surface automatic reminder prompts to export after major progress?

---

## Recommendation

Proceed with the hybrid design:

- local autosave for frictionless same-device resume
- explicit **Resume** or **Start afresh** choice on return
- optional import/export for portability and backup
- versioned JSON with validation and migrations
- strict separation between workspace state and server-trusted state

This offers a clean, understandable, login-free persistence model with a practical balance of usability and resilience.

