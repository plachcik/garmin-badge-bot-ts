import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optionalInt(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) throw new Error(`Invalid integer for ${key}: "${raw}"`);
  return parsed;
}

function optionalBool(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  return raw.toLowerCase() === "true";
}

const dataDir = process.env["DATA_DIR"] ?? ".";
if (dataDir !== ".") {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const config = {
  telegramBotToken: requireEnv("TELEGRAM_BOT_TOKEN"),
  adminChatId: optionalInt("ADMIN_TELEGRAM_CHAT_ID", 0),
  dataDir,
  subscribersFile: path.join(dataDir, "subscribers.json"),
  subscriberNamesFile: path.join(dataDir, "subscriber_names.json"),
  dailyHour: optionalInt("DAILY_HOUR", 8),
  dailyMinute: optionalInt("DAILY_MINUTE", 0),
  weeklyEveryDay: optionalBool("WEEKLY_EVERY_DAY", false),
  showBadgeImage: optionalBool("SHOW_BADGE_IMAGE", false),
  apiPort: optionalInt("PORT", 3000),
  subscriberConfigFile: path.join(dataDir, "subscriber-config.json"),
} as const;
