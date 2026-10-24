import { describe, it, expect, vi } from "vitest";

vi.mock("../config.js", () => ({ config: {} }));
vi.mock("../jobs.js", () => ({
  activeTargets: vi.fn(),
  sendWeeklyDigest: vi.fn(),
  sendTodaySpecial: vi.fn(),
}));

const { computeDueChats, specialTime } = await import("../scheduler.js");

// 2026-10-26 is a Monday, 2026-10-27 a Tuesday
const MONDAY_0800 = new Date("2026-10-26T08:00:00Z");
const MONDAY_0801 = new Date("2026-10-26T08:01:00Z");
const TUESDAY_0800 = new Date("2026-10-27T08:00:00Z");

const mondaysOnly = { dailyHour: 8, dailyMinute: 0, weeklyEveryDay: false };
const everyDay = { dailyHour: 8, dailyMinute: 0, weeklyEveryDay: true };

describe("specialTime", () => {
  it("is one minute after the weekly digest", () => {
    expect(specialTime(8, 0)).toEqual({ hour: 8, minute: 1 });
  });

  it("rolls over to the next hour", () => {
    expect(specialTime(8, 59)).toEqual({ hour: 9, minute: 0 });
  });

  it("rolls over midnight", () => {
    expect(specialTime(23, 59)).toEqual({ hour: 0, minute: 0 });
  });
});

describe("computeDueChats", () => {
  it("sends weekly digest on Monday at the scheduled time", () => {
    const due = computeDueChats(MONDAY_0800, [{ chatId: 1, schedule: mondaysOnly }]);
    expect(due).toEqual({ weekly: [1], special: [] });
  });

  it("skips weekly digest on other days unless weeklyEveryDay", () => {
    const due = computeDueChats(TUESDAY_0800, [
      { chatId: 1, schedule: mondaysOnly },
      { chatId: 2, schedule: everyDay },
    ]);
    expect(due.weekly).toEqual([2]);
  });

  it("sends today-special one minute later every day", () => {
    const due = computeDueChats(MONDAY_0801, [{ chatId: 1, schedule: mondaysOnly }]);
    expect(due).toEqual({ weekly: [], special: [1] });
  });

  it("uses each chat's own schedule", () => {
    const due = computeDueChats(new Date("2026-10-27T18:30:00Z"), [
      { chatId: 1, schedule: everyDay },
      { chatId: 2, schedule: { dailyHour: 18, dailyMinute: 30, weeklyEveryDay: true } },
    ]);
    expect(due).toEqual({ weekly: [2], special: [] });
  });

  it("returns nothing outside scheduled minutes", () => {
    const due = computeDueChats(new Date("2026-10-26T12:00:00Z"), [{ chatId: 1, schedule: everyDay }]);
    expect(due).toEqual({ weekly: [], special: [] });
  });
});
