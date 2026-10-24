import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Badge } from "../types.js";

// Mock fetch globally before importing the module
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { fetchBadgeUpdates, fetchSingleDayBadges } = await import("../garminClient.js");

const makeBadge = (overrides: Partial<Badge> = {}): Badge => {
  const now = new Date();
  // Default end_date: within current week (Wednesday)
  const weekMonday = new Date(now);
  weekMonday.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  weekMonday.setHours(0, 0, 0, 0);
  const endDate = new Date(weekMonday);
  endDate.setDate(weekMonday.getDate() + 2);

  return {
    id: 1,
    name: "Test Badge",
    description: "Test description.",
    image_path: null,
    points: 1,
    category_id: 1,
    difficulty_id: 1,
    target_value: null,
    start_date: new Date(now.getTime() - 86400000).toISOString(),
    end_date: endDate.toISOString(),
    repeatable: false,
    premium: false,
    category: { id: 1, key: "activities", name: null },
    difficulty: { id: 1, key: "EASY", name: null, points: 0 },
    countries: [],
    ...overrides,
  };
};

const mockApi = (badges: Badge[]) => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => badges,
  });
};

beforeEach(() => {
  mockFetch.mockReset();
});

// ── fetchBadgeUpdates ─────────────────────────────────────────────────────────

describe("fetchBadgeUpdates", () => {
  it("returns badge ending this week", async () => {
    mockApi([makeBadge({ name: "Good" })]);
    const { availableChallenges } = await fetchBadgeUpdates();
    expect(availableChallenges.some((b) => b.name === "Good")).toBe(true);
  });

  it("excludes badge with null end_date", async () => {
    mockApi([makeBadge({ end_date: null })]);
    const { availableChallenges } = await fetchBadgeUpdates();
    expect(availableChallenges).toHaveLength(0);
  });

  it("excludes badge ending in the future outside this week", async () => {
    const future = new Date();
    future.setDate(future.getDate() + 14);
    mockApi([makeBadge({ end_date: future.toISOString() })]);
    const { availableChallenges } = await fetchBadgeUpdates();
    expect(availableChallenges).toHaveLength(0);
  });

  it("excludes premium badges", async () => {
    mockApi([makeBadge({ premium: true })]);
    const { availableChallenges } = await fetchBadgeUpdates();
    expect(availableChallenges).toHaveLength(0);
  });

  it("excludes country-restricted badge without PL", async () => {
    mockApi([makeBadge({ countries: [{ id: "CN", name: "China Mainland" }] })]);
    const { availableChallenges } = await fetchBadgeUpdates();
    expect(availableChallenges).toHaveLength(0);
  });

  it("includes country-restricted badge with PL", async () => {
    mockApi([makeBadge({ countries: [{ id: "PL", name: "Poland" }] })]);
    const { availableChallenges } = await fetchBadgeUpdates();
    expect(availableChallenges).toHaveLength(1);
  });

  it("includes badge with empty countries array", async () => {
    mockApi([makeBadge({ countries: [] })]);
    const { availableChallenges } = await fetchBadgeUpdates();
    expect(availableChallenges).toHaveLength(1);
  });

  it("sorts badges by end_date ascending", async () => {
    const now = new Date();
    const weekMonday = new Date(now);
    weekMonday.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    weekMonday.setHours(0, 0, 0, 0);

    const soon = new Date(weekMonday);
    soon.setDate(weekMonday.getDate() + 1);
    const later = new Date(weekMonday);
    later.setDate(weekMonday.getDate() + 3);

    mockApi([
      makeBadge({ id: 2, name: "Later", end_date: later.toISOString() }),
      makeBadge({ id: 1, name: "Soon", end_date: soon.toISOString() }),
    ]);
    const { availableChallenges } = await fetchBadgeUpdates();
    expect(availableChallenges[0]?.name).toBe("Soon");
    expect(availableChallenges[1]?.name).toBe("Later");
  });

  it("propagates API errors", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(fetchBadgeUpdates()).rejects.toThrow("500");
  });
});

// ── fetchSingleDayBadges ──────────────────────────────────────────────────────

describe("fetchSingleDayBadges", () => {
  it("returns matching single-day badge for today", async () => {
    const today = new Date();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const badge = makeBadge({
      start_date: `2019-${m}-${d}T00:00:00`,
      end_date: `2026-${m}-${d}T23:59:59`,
    });
    mockApi([badge]);
    const result = await fetchSingleDayBadges();
    expect(result).toHaveLength(1);
  });

  it("excludes badge with different start/end day", async () => {
    mockApi([makeBadge({
      start_date: "2019-01-01T00:00:00",
      end_date: "2019-01-02T23:59:59",
    })]);
    expect(await fetchSingleDayBadges()).toHaveLength(0);
  });

  it("excludes premium single-day badge", async () => {
    const today = new Date();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    mockApi([makeBadge({
      premium: true,
      start_date: `2019-${m}-${d}T00:00:00`,
      end_date: `2026-${m}-${d}T23:59:59`,
    })]);
    expect(await fetchSingleDayBadges()).toHaveLength(0);
  });

  it("excludes country-restricted badge without PL", async () => {
    const today = new Date();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    mockApi([makeBadge({
      countries: [{ id: "CN", name: "China Mainland" }],
      start_date: `2019-${m}-${d}T00:00:00`,
      end_date: `2026-${m}-${d}T23:59:59`,
    })]);
    expect(await fetchSingleDayBadges()).toHaveLength(0);
  });

  it("accepts a custom target date", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const d = String(tomorrow.getDate()).padStart(2, "0");
    mockApi([makeBadge({
      start_date: `2019-${m}-${d}T00:00:00`,
      end_date: `2026-${m}-${d}T23:59:59`,
    })]);
    expect(await fetchSingleDayBadges(tomorrow)).toHaveLength(1);
  });

  it("returns empty list when no matching badges", async () => {
    mockApi([]);
    expect(await fetchSingleDayBadges()).toHaveLength(0);
  });
});
