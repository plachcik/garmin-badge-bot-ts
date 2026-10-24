import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Badge } from "../types.js";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "badge-lists-"));
vi.mock("../config.js", () => ({ config: { dataDir } }));

const { loadIgnoredBadgeIds, setBadgeIgnored, withoutIgnored } = await import("../ignoredBadges.js");
const { loadSentBadges, recordSentBadges } = await import("../sentBadges.js");

const badge = (id: number) => ({ id, name: `Badge ${id}` }) as Badge;

beforeEach(() => {
  for (const f of fs.readdirSync(dataDir)) {
    fs.unlinkSync(path.join(dataDir, f));
  }
});

describe("ignoredBadges", () => {
  it("starts empty", () => {
    expect(loadIgnoredBadgeIds()).toEqual([]);
  });

  it("adds and removes IDs without duplicates", () => {
    setBadgeIgnored(1, true);
    setBadgeIgnored(1, true);
    setBadgeIgnored(2, true);
    setBadgeIgnored(1, false);
    expect(loadIgnoredBadgeIds()).toEqual([2]);
  });

  it("filters out ignored badges", () => {
    setBadgeIgnored(2, true);
    expect(withoutIgnored([badge(1), badge(2), badge(3)]).map((b) => b.id)).toEqual([1, 3]);
  });
});

describe("sentBadges", () => {
  it("keeps the latest send per badge", () => {
    recordSentBadges([badge(1), badge(2)], "weekly");
    recordSentBadges([badge(1)], "today");
    const sent = loadSentBadges();
    expect(sent).toHaveLength(2);
    expect(sent.find((s) => s.badge.id === 1)?.kind).toBe("today");
  });

  it("drops entries older than 30 days", () => {
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    fs.writeFileSync(
      path.join(dataDir, "sent-badges.json"),
      JSON.stringify({ "1": { badge: badge(1), kind: "weekly", sentAt: old } }),
    );
    expect(loadSentBadges()).toEqual([]);
  });
});
