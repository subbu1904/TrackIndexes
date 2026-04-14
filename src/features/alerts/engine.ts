import type { IndexSnapshot } from '../indexes/types';
import type { AlertMode } from '../preferences/types';

export interface AlertEngineSettings {
  mode: AlertMode;
  thresholdPoints: number;
}

export interface AlertEvent {
  id: string;
  mode: AlertMode;
  currentValue: number;
  deltaPoints: number;
  thresholdPoints: number;
  crossedBand: number;
  referenceValue: number;
}

interface AlertSessionEntry {
  appOpenBaseline?: number;
  lastFetchedValue?: number;
  previousCloseReference?: number;
  lastNotifiedAppOpenBand: number;
  lastNotifiedPreviousCloseBand: number;
}

export interface AlertSessionState {
  byIndex: Record<string, AlertSessionEntry>;
}

export function createAlertSessionState(): AlertSessionState {
  return { byIndex: {} };
}

export function evaluateAlertBatch(
  snapshots: IndexSnapshot[],
  settings: AlertEngineSettings,
  currentState: AlertSessionState
): { events: AlertEvent[]; nextState: AlertSessionState } {
  const thresholdPoints = normalizeThreshold(settings.thresholdPoints);
  const nextState: AlertSessionState = {
    byIndex: { ...currentState.byIndex },
  };
  const events: AlertEvent[] = [];

  for (const snapshot of snapshots) {
    const existingEntry = nextState.byIndex[snapshot.id];
    const entry: AlertSessionEntry = {
      appOpenBaseline: existingEntry?.appOpenBaseline,
      lastFetchedValue: existingEntry?.lastFetchedValue,
      previousCloseReference: existingEntry?.previousCloseReference,
      lastNotifiedAppOpenBand: existingEntry?.lastNotifiedAppOpenBand ?? 0,
      lastNotifiedPreviousCloseBand: existingEntry?.lastNotifiedPreviousCloseBand ?? 0,
    };

    if (entry.appOpenBaseline === undefined) {
      entry.appOpenBaseline = snapshot.value;
    }

    if (settings.mode === 'since_app_open') {
      const event = evaluateThresholdCrossing(
        snapshot,
        settings.mode,
        thresholdPoints,
        entry.appOpenBaseline,
        entry.lastNotifiedAppOpenBand
      );

      if (event) {
        events.push(event);
        entry.lastNotifiedAppOpenBand = event.crossedBand;
      }
    }

    if (settings.mode === 'since_previous_fetch' && entry.lastFetchedValue !== undefined) {
      const deltaPoints = roundToTwo(snapshot.value - entry.lastFetchedValue);
      if (deltaPoints >= thresholdPoints) {
        events.push({
          id: snapshot.id,
          mode: settings.mode,
          currentValue: snapshot.value,
          deltaPoints,
          thresholdPoints,
          crossedBand: Math.floor(deltaPoints / thresholdPoints),
          referenceValue: entry.lastFetchedValue,
        });
      }
    }

    if (settings.mode === 'since_previous_close') {
      const previousCloseReference = roundToTwo(snapshot.value - snapshot.absoluteChange);
      if (
        entry.previousCloseReference === undefined ||
        !isSameReference(entry.previousCloseReference, previousCloseReference)
      ) {
        entry.previousCloseReference = previousCloseReference;
        entry.lastNotifiedPreviousCloseBand = 0;
      }

      const event = evaluateThresholdCrossing(
        snapshot,
        settings.mode,
        thresholdPoints,
        previousCloseReference,
        entry.lastNotifiedPreviousCloseBand
      );

      if (event) {
        events.push(event);
        entry.lastNotifiedPreviousCloseBand = event.crossedBand;
      }
    }

    entry.lastFetchedValue = snapshot.value;
    nextState.byIndex[snapshot.id] = entry;
  }

  return { events, nextState };
}

function evaluateThresholdCrossing(
  snapshot: IndexSnapshot,
  mode: AlertMode,
  thresholdPoints: number,
  referenceValue: number,
  lastNotifiedBand: number
): AlertEvent | null {
  const deltaPoints = roundToTwo(snapshot.value - referenceValue);
  if (deltaPoints < thresholdPoints) {
    return null;
  }

  const crossedBand = Math.floor(deltaPoints / thresholdPoints);
  if (crossedBand <= lastNotifiedBand) {
    return null;
  }

  return {
    id: snapshot.id,
    mode,
    currentValue: snapshot.value,
    deltaPoints,
    thresholdPoints,
    crossedBand,
    referenceValue,
  };
}

function normalizeThreshold(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.round(value));
}

function isSameReference(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.005;
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
