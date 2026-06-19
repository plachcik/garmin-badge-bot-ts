import fs from "node:fs";
import { config } from "./config.js";

export interface ChatConfig {
  showImages?: boolean;
  active?: boolean;
  dailyHour?: number;
  dailyMinute?: number;
  weeklyEveryDay?: boolean;
}

const CONFIG_FILE = () =>
  config.subscriberConfigFile;

function readAll(): Record<string, ChatConfig> {
  const file = CONFIG_FILE();
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, ChatConfig>;
}

function writeAll(data: Record<string, ChatConfig>): void {
  fs.writeFileSync(CONFIG_FILE(), JSON.stringify(data, null, 2), "utf-8");
}

export function getSubscriberConfig(chatId: number): ChatConfig {
  return readAll()[String(chatId)] ?? {};
}

export function setSubscriberConfig(chatId: number, patch: Partial<ChatConfig>): void {
  const all = readAll();
  all[String(chatId)] = { ...all[String(chatId)], ...patch };
  writeAll(all);
}

export function getAllSubscriberConfigs(): Record<string, ChatConfig> {
  return readAll();
}
