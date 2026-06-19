import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";

// Mock config before importing subscribers
vi.mock("../config.js", () => ({
  config: {
    subscribersFile: "/tmp/test-subscribers.json",
    subscriberNamesFile: "/tmp/test-subscriber-names.json",
  },
}));

const { addSubscriber, removeSubscriber, loadSubscribers, loadSubscriberNames, saveSubscriberName } =
  await import("../subscribers.js");

beforeEach(() => {
  // Clean up test files before each test
  ["/tmp/test-subscribers.json", "/tmp/test-subscriber-names.json"].forEach((f) => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
});

describe("addSubscriber", () => {
  it("adds a new subscriber and returns true", () => {
    expect(addSubscriber(123)).toBe(true);
    expect(loadSubscribers()).toEqual([123]);
  });

  it("returns false for duplicate subscriber", () => {
    addSubscriber(123);
    expect(addSubscriber(123)).toBe(false);
    expect(loadSubscribers()).toHaveLength(1);
  });

  it("can add multiple subscribers", () => {
    addSubscriber(1);
    addSubscriber(2);
    addSubscriber(3);
    expect(loadSubscribers()).toHaveLength(3);
  });
});

describe("removeSubscriber", () => {
  it("removes an existing subscriber and returns true", () => {
    addSubscriber(123);
    expect(removeSubscriber(123)).toBe(true);
    expect(loadSubscribers()).toEqual([]);
  });

  it("returns false when subscriber not found", () => {
    expect(removeSubscriber(999)).toBe(false);
  });

  it("removes subscriber name entry too", () => {
    addSubscriber(123);
    saveSubscriberName(123, "Test User");
    removeSubscriber(123);
    expect(loadSubscriberNames()["123"]).toBeUndefined();
  });

  it("does not affect other subscribers", () => {
    addSubscriber(1);
    addSubscriber(2);
    addSubscriber(3);
    removeSubscriber(2);
    expect(loadSubscribers()).toEqual([1, 3]);
  });
});

describe("saveSubscriberName / loadSubscriberNames", () => {
  it("saves and loads a name", () => {
    saveSubscriberName(123, "Jan Kowalski");
    expect(loadSubscriberNames()["123"]).toBe("Jan Kowalski");
  });

  it("updates existing name", () => {
    saveSubscriberName(123, "Old Name");
    saveSubscriberName(123, "New Name");
    expect(loadSubscriberNames()["123"]).toBe("New Name");
  });

  it("returns empty object when file missing", () => {
    expect(loadSubscriberNames()).toEqual({});
  });
});

describe("loadSubscribers", () => {
  it("returns empty array when file missing", () => {
    expect(loadSubscribers()).toEqual([]);
  });
});
