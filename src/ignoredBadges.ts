import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import type { Badge } from "./types.js";

const filePath = (): string => {
  return path.join(config.dataDir, "ignored-badges.json");
};

export const loadIgnoredBadgeIds = (): number[] => {
  const f = filePath();
  if (!fs.existsSync(f)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(f, "utf-8")) as number[];
};

export const setBadgeIgnored = (badgeId: number, ignored: boolean): void => {
  const ids = new Set(loadIgnoredBadgeIds());
  if (ignored) {
    ids.add(badgeId);
  } else {
    ids.delete(badgeId);
  }
  fs.writeFileSync(filePath(), JSON.stringify([...ids], null, 2), "utf-8");
};

/** Drops badges whose IDs are on the ignore list. */
export const withoutIgnored = (badges: Badge[]): Badge[] => {
  const ignored = new Set(loadIgnoredBadgeIds());
  return badges.filter((b) => !ignored.has(b.id));
};
