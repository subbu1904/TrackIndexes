import { describe, expect, test } from 'bun:test';
import { createAlertSessionState, evaluateAlertBatch } from './engine';
import type { IndexSnapshot } from '../indexes/types';

function createSnapshot(overrides: Partial<IndexSnapshot> = {}): IndexSnapshot {
  return {
    id: 'nifty50',
    value: 24000,
    absoluteChange: 0,
    percentageChange: 0,
    lastUpdated: 1,
    fetchedAt: 1,
    source: 'mock',
    freshness: 'delayed',
    currency: 'INR',
    ...overrides,
  };
}

describe('evaluateAlertBatch', () => {
  test('emits one session-based alert when a new since-app-open threshold band is crossed', () => {
    const initialState = createAlertSessionState();

    const firstPass = evaluateAlertBatch(
      [createSnapshot({ value: 24000 })],
      { mode: 'since_app_open', thresholdPoints: 50 },
      initialState
    );
    expect(firstPass.events).toHaveLength(0);

    const secondPass = evaluateAlertBatch(
      [createSnapshot({ value: 24049, fetchedAt: 2, lastUpdated: 2 })],
      { mode: 'since_app_open', thresholdPoints: 50 },
      firstPass.nextState
    );
    expect(secondPass.events).toHaveLength(0);

    const thirdPass = evaluateAlertBatch(
      [createSnapshot({ value: 24125, fetchedAt: 3, lastUpdated: 3 })],
      { mode: 'since_app_open', thresholdPoints: 50 },
      secondPass.nextState
    );
    expect(thirdPass.events).toHaveLength(1);
    expect(thirdPass.events[0]).toMatchObject({
      mode: 'since_app_open',
      deltaPoints: 125,
      crossedBand: 2,
      referenceValue: 24000,
    });

    const duplicateBandPass = evaluateAlertBatch(
      [createSnapshot({ value: 24140, fetchedAt: 4, lastUpdated: 4 })],
      { mode: 'since_app_open', thresholdPoints: 50 },
      thirdPass.nextState
    );
    expect(duplicateBandPass.events).toHaveLength(0);
  });

  test('emits a previous-fetch alert only when the latest refresh rises past the threshold', () => {
    const initialState = createAlertSessionState();

    const firstPass = evaluateAlertBatch(
      [createSnapshot({ value: 24000 })],
      { mode: 'since_previous_fetch', thresholdPoints: 50 },
      initialState
    );
    expect(firstPass.events).toHaveLength(0);

    const secondPass = evaluateAlertBatch(
      [createSnapshot({ value: 24020, fetchedAt: 2, lastUpdated: 2 })],
      { mode: 'since_previous_fetch', thresholdPoints: 50 },
      firstPass.nextState
    );
    expect(secondPass.events).toHaveLength(0);

    const thirdPass = evaluateAlertBatch(
      [createSnapshot({ value: 24085, fetchedAt: 3, lastUpdated: 3 })],
      { mode: 'since_previous_fetch', thresholdPoints: 50 },
      secondPass.nextState
    );
    expect(thirdPass.events).toHaveLength(1);
    expect(thirdPass.events[0]).toMatchObject({
      mode: 'since_previous_fetch',
      deltaPoints: 65,
      referenceValue: 24020,
    });
  });

  test('derives previous close from snapshot change and avoids repeating the same previous-close band', () => {
    const initialState = createAlertSessionState();

    const firstPass = evaluateAlertBatch(
      [createSnapshot({ value: 24060, absoluteChange: 60 })],
      { mode: 'since_previous_close', thresholdPoints: 50 },
      initialState
    );
    expect(firstPass.events).toHaveLength(1);
    expect(firstPass.events[0]).toMatchObject({
      mode: 'since_previous_close',
      deltaPoints: 60,
      referenceValue: 24000,
      crossedBand: 1,
    });

    const secondPass = evaluateAlertBatch(
      [createSnapshot({ value: 24080, absoluteChange: 80, fetchedAt: 2, lastUpdated: 2 })],
      { mode: 'since_previous_close', thresholdPoints: 50 },
      firstPass.nextState
    );
    expect(secondPass.events).toHaveLength(0);

    const thirdPass = evaluateAlertBatch(
      [createSnapshot({ value: 24110, absoluteChange: 110, fetchedAt: 3, lastUpdated: 3 })],
      { mode: 'since_previous_close', thresholdPoints: 50 },
      secondPass.nextState
    );
    expect(thirdPass.events).toHaveLength(1);
    expect(thirdPass.events[0]).toMatchObject({
      crossedBand: 2,
      deltaPoints: 110,
    });
  });
});
