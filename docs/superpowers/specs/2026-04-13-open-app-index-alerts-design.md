## Open-App Index Alerts

### Scope

Add configurable alerting while the app is open. Alerts apply only to selected indexes and support three modes:

- `since_app_open`
- `since_previous_fetch`
- `since_previous_close`

No backend or closed-app push delivery is included in this phase.

### Settings

Persist alert preferences alongside the existing selected index preferences:

- `enabled`
- `mode`
- `thresholdPoints`

Defaults:

- enabled: `true`
- mode: `since_app_open`
- thresholdPoints: `50`

### Evaluation Rules

- `since_app_open`: capture the first seen value in the current app session and notify when the latest value crosses a new positive threshold band above that baseline.
- `since_previous_fetch`: compare the latest value to the immediately previous fetched value and notify when the increase is at least the configured threshold.
- `since_previous_close`: derive previous close as `value - absoluteChange` and notify when the latest value crosses a new positive threshold band above that reference.

### Delivery

- Prefer browser notifications when permission is granted.
- Fall back to an in-app toast stack when permission is unavailable or denied.

### De-duplication

- Upward movement only.
- `since_app_open` and `since_previous_close` track the highest threshold band notified per index for the current session.
- `since_previous_fetch` evaluates only the latest refresh delta.
- Session trackers reset when alert mode, threshold, or selected indexes change.

### Verification

- Add pure alert-engine tests first.
- Verify persistence and build/lint after integration.
