import { describe, expect, test } from 'bun:test';
import { migrateWorkspace } from './migrate';

describe('migrateWorkspace', () => {
  test('hydrates missing alert preferences with defaults for older saved workspaces', () => {
    const migrated = migrateWorkspace({
      version: 1,
      preferences: {
        selectedIndexIds: ['nifty50'],
        theme: 'dark',
      },
      savedAt: 123,
    });

    expect(migrated.preferences.selectedIndexIds).toEqual(['nifty50']);
    expect(migrated.preferences.alerts).toEqual({
      enabled: true,
      mode: 'since_app_open',
      thresholdPoints: 50,
    });
  });
});
