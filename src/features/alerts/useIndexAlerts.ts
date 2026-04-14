import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { getIndexById } from '../indexes/catalog/indexCatalog';
import type { IndexSnapshot } from '../indexes/types';
import { formatNumber } from '../../shared/lib/formatNumber';
import { usePreferencesStore } from '../preferences/store/usePreferencesStore';
import { createAlertSessionState, evaluateAlertBatch, type AlertEvent } from './engine';

interface AlertToast {
  id: string;
  title: string;
  message: string;
}

const TOAST_TTL_MS = 5000;

export function useIndexAlerts(snapshots: IndexSnapshot[], trackedIndexIds: string[]) {
  const alerts = usePreferencesStore((state) => state.alerts);
  const [toasts, setToasts] = useState<AlertToast[]>([]);
  const sessionRef = useRef(createAlertSessionState());
  const resetKey = useMemo(
    () =>
      JSON.stringify({
        trackedIndexIds: [...trackedIndexIds].sort(),
        mode: alerts.mode,
        thresholdPoints: alerts.thresholdPoints,
      }),
    [trackedIndexIds, alerts.mode, alerts.thresholdPoints]
  );

  useEffect(() => {
    sessionRef.current = createAlertSessionState();
  }, [resetKey]);

  useEffect(() => {
    if (!alerts.enabled || snapshots.length === 0) {
      return;
    }

    const { events, nextState } = evaluateAlertBatch(
      snapshots,
      {
        mode: alerts.mode,
        thresholdPoints: alerts.thresholdPoints,
      },
      sessionRef.current
    );

    sessionRef.current = nextState;
    if (events.length === 0) {
      return;
    }

    const browserNotificationsAllowed =
      typeof Notification !== 'undefined' && Notification.permission === 'granted';

    for (const event of events) {
      const payload = buildAlertCopy(event);
      if (browserNotificationsAllowed) {
        showBrowserNotification(payload.title, payload.message, event);
        continue;
      }

      enqueueToast(payload.title, payload.message, setToasts);
    }
  }, [alerts.enabled, alerts.mode, alerts.thresholdPoints, snapshots]);

  return {
    toasts,
    dismissToast: (toastId: string) => {
      setToasts((current) => current.filter((toast) => toast.id !== toastId));
    },
  };
}

function enqueueToast(
  title: string,
  message: string,
  setToasts: Dispatch<SetStateAction<AlertToast[]>>
) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  setToasts((current) => [...current, { id, title, message }].slice(-4));
  window.setTimeout(() => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, TOAST_TTL_MS);
}

function buildAlertCopy(event: AlertEvent) {
  const indexName = getIndexById(event.id)?.name ?? event.id;
  const currentValue = formatNumber(event.currentValue);
  const deltaLabel = formatNumber(event.deltaPoints);

  switch (event.mode) {
    case 'since_app_open':
      return {
        title: `${indexName} crossed +${event.crossedBand * event.thresholdPoints}`,
        message: `${indexName} is up ${deltaLabel} points since app open. Current value: ${currentValue}.`,
      };
    case 'since_previous_fetch':
      return {
        title: `${indexName} jumped ${deltaLabel} points`,
        message: `${indexName} rose ${deltaLabel} points since the last refresh. Current value: ${currentValue}.`,
      };
    case 'since_previous_close':
      return {
        title: `${indexName} crossed +${event.crossedBand * event.thresholdPoints} vs close`,
        message: `${indexName} is up ${deltaLabel} points versus previous close. Current value: ${currentValue}.`,
      };
  }
}

function showBrowserNotification(title: string, message: string, event: AlertEvent) {
  try {
    new Notification(title, {
      body: message,
      tag: `${event.id}-${event.mode}-${event.crossedBand}`,
    });
  } catch {
    // If browser notification delivery fails at runtime, the app still continues.
  }
}
