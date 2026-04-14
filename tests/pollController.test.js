import test from "node:test";
import assert from "node:assert/strict";

import { createPollController } from "../src/services/pollController.js";

test("start loads both tracked indices and emits an update", async () => {
  const calls = [];
  let intervalCallback = null;

  const controller = createPollController({
    fetchQuoteImpl: async (symbol) => {
      calls.push(symbol);
      return { symbol };
    },
    now: () => 60_000,
    setIntervalImpl: (callback) => {
      intervalCallback = callback;
      return 1;
    },
    clearIntervalImpl: () => {},
    onlineSource: () => true
  });

  const events = [];
  controller.subscribe((event) => events.push(event));

  const started = await controller.start();

  assert.equal(started, true);
  assert.deepEqual(calls, ["^NSEI", "^BSESN"]);
  assert.equal(typeof intervalCallback, "function");
  assert.deepEqual(events.at(-1), {
    type: "update",
    quotes: [{ symbol: "^NSEI" }, { symbol: "^BSESN" }],
    lastUpdatedAt: 60_000
  });
});

test("forceRefresh respects the minimum refresh interval", async () => {
  let nowValue = 60_000;
  const calls = [];

  const controller = createPollController({
    fetchQuoteImpl: async (symbol) => {
      calls.push(symbol);
      return { symbol };
    },
    now: () => nowValue,
    setIntervalImpl: () => 1,
    clearIntervalImpl: () => {},
    onlineSource: () => true
  });

  await controller.start();

  nowValue = 90_000;
  const blockedRefresh = await controller.forceRefresh();

  nowValue = 121_000;
  const allowedRefresh = await controller.forceRefresh();

  assert.equal(blockedRefresh, false);
  assert.equal(allowedRefresh, true);
  assert.equal(calls.length, 4);
});

test("start emits offline status instead of fetching when the device is offline", async () => {
  const controller = createPollController({
    fetchQuoteImpl: async () => {
      throw new Error("should not fetch");
    },
    now: () => 60_000,
    setIntervalImpl: () => 1,
    clearIntervalImpl: () => {},
    onlineSource: () => false
  });

  const events = [];
  controller.subscribe((event) => events.push(event));

  const started = await controller.start();

  assert.equal(started, false);
  assert.deepEqual(events, [{ type: "status", status: "offline" }]);
});

test("controller retries when connectivity returns after start", async () => {
  let online = false;
  let onlineHandler = null;
  const calls = [];

  const controller = createPollController({
    fetchQuoteImpl: async (symbol) => {
      calls.push(symbol);
      return { symbol };
    },
    now: () => 120_000,
    setIntervalImpl: () => 1,
    clearIntervalImpl: () => {},
    addEventListenerImpl: (eventName, handler) => {
      if (eventName === "online") {
        onlineHandler = handler;
      }
    },
    removeEventListenerImpl: () => {},
    onlineSource: () => online
  });

  const events = [];
  controller.subscribe((event) => events.push(event));

  await controller.start();
  online = true;
  await onlineHandler?.();

  assert.deepEqual(calls, ["^NSEI", "^BSESN"]);
  assert.equal(events.at(-1).type, "update");
});
