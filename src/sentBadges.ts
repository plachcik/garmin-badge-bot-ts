import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import type { Badge } from "./types.js";

export type SentKind = "weekly" | "today" | "tomorrow";

export interface SentBadge {
  badge: Badge;
  kind: SentKind;
  sentAt: string;
}

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const filePath = (): string => {
  return path.join(config.dataDir, "sent-badges.json");
};

/** Last send per badge ID, newest first, limited to the retention window. */
export const loadSentBadges = (): SentBadge[] => {
  const f = filePath();
  if (!fs.existsSync(f)) {
    return [];
  }
  const all = JSON.parse(fs.readFileSync(f, "utf-8")) as Record<string, SentBadge>;
  const cutoff = Date.now() - RETENTION_MS;
  return Object.values(all)
    .filter((s) => Date.parse(s.sentAt) >= cutoff)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
};

export const recordSentBadges = (badges: Badge[], kind: SentKind): void => {
  if (badges.length === 0) {
    return;
  }
  const sentAt = new Date().toISOString();
  const entries: Record<string, SentBadge> = {};
  for (const s of loadSentBadges()) {
    entries[String(s.badge.id)] = s;
  }
  for (const badge of badges) {
    entries[String(badge.id)] = { badge, kind, sentAt };
  }
  fs.writeFileSync(filePath(), JSON.stringify(entries, null, 2), "utf-8");
};
