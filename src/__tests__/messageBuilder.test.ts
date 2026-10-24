import { describe, it, expect } from "vitest";
import {
  escapeMarkdownV2,
  formatGoal,
  badgeCaption,
  buildWeeklyMessage,
  buildTodaySpecialMessage,
  buildTomorrowSpecialMessage,
  badgeImageUrl,
} from "../messageBuilder.js";
import type { Badge } from "../types.js";

const makeBadge = (overrides: Partial<Badge> = {}): Badge => {
  return {
    id: 1,
    name: "Test Badge",
    description: "Join this challenge and record a running activity.",
    image_path: null,
    points: 1,
    category_id: 1,
    difficulty_id: 1,
    target_value: null,
    start_date: "2026-06-12T00:00:00",
    end_date: "2026-06-14T23:59:59",
    repeatable: false,
    premium: false,
    category: { id: 1, key: "activities", name: null },
    difficulty: { id: 1, key: "EASY", name: null, points: 0 },
    countries: [],
    ...overrides,
  };
};

// ── escapeMarkdownV2 ──────────────────────────────────────────────────────────

describe("escapeMarkdownV2", () => {
  it("leaves plain text unchanged", () => {
    expect(escapeMarkdownV2("hello world")).toBe("hello world");
  });

  it("escapes exclamation mark", () => {
    expect(escapeMarkdownV2("Żeby nie umknęło!")).toBe("Żeby nie umknęło\\!");
  });

  it("escapes dot", () => {
    expect(escapeMarkdownV2("3.14")).toBe("3\\.14");
  });

  it("escapes parentheses", () => {
    expect(escapeMarkdownV2("(łącznie)")).toBe("\\(łącznie\\)");
  });

  it("leaves Polish characters untouched", () => {
    expect(escapeMarkdownV2("ąęśćżźółń")).toBe("ąęśćżźółń");
  });

  it("escapes dash", () => {
    expect(escapeMarkdownV2("a-b")).toBe("a\\-b");
  });

  it("returns empty string unchanged", () => {
    expect(escapeMarkdownV2("")).toBe("");
  });
});

// ── formatGoal ────────────────────────────────────────────────────────────────

describe("formatGoal", () => {
  it("returns empty string when no target_value", () => {
    expect(formatGoal(makeBadge({ target_value: null, description: "Do something." }))).toBe("");
  });

  it("returns Dowolna aktywność for 'record an activity' prefix", () => {
    expect(
      formatGoal(makeBadge({ target_value: null, description: "Record an activity on Global Wellness Day." })),
    ).toBe("Dowolna aktywność");
  });

  it("extracts cycling activity label", () => {
    expect(
      formatGoal(makeBadge({ target_value: null, description: "Join this challenge and record a 40-kilometer cycling activity." })),
    ).toBe("Jazda na rowerze");
  });

  it("extracts running activity label", () => {
    expect(
      formatGoal(makeBadge({ target_value: null, description: "Record a running activity." })),
    ).toBe("Bieganie");
  });

  it("formats steps", () => {
    expect(
      formatGoal(makeBadge({ target_value: "100000.00", description: "Record 100,000 steps in June." })),
    ).toBe("100,000 kroków (łącznie)");
  });

  it("formats meters to km", () => {
    expect(
      formatGoal(makeBadge({ target_value: "1000.00", description: "Record 1,000 meters of swimming activities." })),
    ).toBe("1 km (łącznie)");
  });

  it("formats kilometers", () => {
    expect(
      formatGoal(makeBadge({ target_value: "100000.00", description: "Record 100 kilometers of cycling activities." })),
    ).toBe("100 km (łącznie)");
  });

  it("formats hours from seconds", () => {
    expect(
      formatGoal(makeBadge({ target_value: "10800.00", description: "Record at least 3 hours of cardio activities." })),
    ).toBe("3 h (łącznie)");
  });

  it("formats calories", () => {
    expect(
      formatGoal(makeBadge({ target_value: "8000.00", description: "Burn 8,000 active calories in June." })),
    ).toBe("8,000 kcal (łącznie)");
  });

  it("uses 'jedna aktywność' for single activity", () => {
    expect(
      formatGoal(makeBadge({ target_value: "10000.00", description: "Record a 10-kilometer running activity." })),
    ).toContain("jedna aktywność");
  });
});

// ── badgeImageUrl ─────────────────────────────────────────────────────────────

describe("badgeImageUrl", () => {
  it("returns null when no image_path", () => {
    expect(badgeImageUrl(makeBadge({ image_path: null }))).toBeNull();
  });

  it("returns full URL when image_path present", () => {
    expect(badgeImageUrl(makeBadge({ image_path: "badge_ABC123_sml.png" }))).toBe(
      "https://api.garminbadges.com/storage/badges/badge_ABC123_sml.png",
    );
  });
});

// ── badgeCaption ──────────────────────────────────────────────────────────────

describe("badgeCaption", () => {
  it("includes badge name in bold", () => {
    expect(badgeCaption(makeBadge({ name: "My Badge" }))).toContain("*My Badge*");
  });

  it("includes difficulty stars", () => {
    expect(badgeCaption(makeBadge({ difficulty_id: 2 }))).toContain("⭐⭐");
  });

  it("shows today text when todayOnly", () => {
    const caption = badgeCaption(makeBadge(), { todayOnly: true });
    expect(caption).toContain("Tylko dziś");
    expect(caption).toContain("Rusz dupę");
  });

  it("shows tomorrow text when tomorrowOnly", () => {
    const caption = badgeCaption(makeBadge(), { tomorrowOnly: true });
    expect(caption).toContain("Tylko jutro");
  });

  it("shows same-day format for single-day badge", () => {
    const badge = makeBadge({
      start_date: "2026-06-13T00:00:00",
      end_date: "2026-06-13T23:59:59",
    });
    expect(badgeCaption(badge)).toContain("Wyzwanie tylko 13 czerwca");
  });

  it("shows 'zaczyna się' for future start date", () => {
    const badge = makeBadge({
      start_date: "2099-06-12T00:00:00",
      end_date: "2099-06-14T23:59:59",
    });
    expect(badgeCaption(badge)).toContain("Wyzwanie zaczyna się");
  });

  it("shows 'zaczęło się' for past start date", () => {
    const badge = makeBadge({
      start_date: "2020-01-01T00:00:00",
      end_date: "2099-12-31T23:59:59",
    });
    expect(badgeCaption(badge)).toContain("Wyzwanie zaczęło się");
  });
});

// ── buildWeeklyMessage ────────────────────────────────────────────────────────

describe("buildWeeklyMessage", () => {
  it("returns no-badges message when list is empty", () => {
    expect(buildWeeklyMessage([])).toContain("Brak aktywnych wyzwań");
  });

  it("includes badge name when badges provided", () => {
    expect(buildWeeklyMessage([makeBadge({ name: "Super Badge" })])).toContain("Super Badge");
  });

  it("uses custom header when provided", () => {
    const msg = buildWeeklyMessage([], "Custom Header");
    expect(msg).toContain("Custom Header");
    expect(msg).not.toContain("Żeby nie umknęło");
  });
});

// ── buildTodaySpecialMessage ──────────────────────────────────────────────────

describe("buildTodaySpecialMessage", () => {
  it("includes header", () => {
    expect(buildTodaySpecialMessage([makeBadge()])).toContain("Żeby nie umknęło");
  });

  it("shows Tylko dziś", () => {
    expect(buildTodaySpecialMessage([makeBadge()])).toContain("Tylko dziś");
  });

  it("includes badge name", () => {
    expect(buildTodaySpecialMessage([makeBadge({ name: "Rare Badge" })])).toContain("Rare Badge");
  });
});

// ── buildTomorrowSpecialMessage ───────────────────────────────────────────────

describe("buildTomorrowSpecialMessage", () => {
  it("includes header", () => {
    expect(buildTomorrowSpecialMessage([makeBadge()])).toContain("Jutro nie zapomnij");
  });

  it("shows Tylko jutro", () => {
    expect(buildTomorrowSpecialMessage([makeBadge()])).toContain("Tylko jutro");
  });

  it("does not contain Tylko dziś", () => {
    expect(buildTomorrowSpecialMessage([makeBadge()])).not.toContain("Tylko dziś");
  });
});
