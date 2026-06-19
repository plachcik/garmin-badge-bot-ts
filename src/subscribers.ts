import fs from "node:fs";
import { config } from "./config.js";
import { createLogger } from "./logger.js";

const logger = createLogger("subscribers");

function readJson<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
}

function writeJson(file: string, data: unknown): void {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

export function loadSubscribers(): number[] {
  return readJson<number[]>(config.subscribersFile, []);
}

function saveSubscribers(ids: number[]): void {
  writeJson(config.subscribersFile, ids);
}

export function loadSubscriberNames(): Record<string, string> {
  return readJson<Record<string, string>>(config.subscriberNamesFile, {});
}

export function saveSubscriberName(chatId: number, name: string): void {
  const names = loadSubscriberNames();
  names[String(chatId)] = name;
  writeJson(config.subscriberNamesFile, names);
}

export function addSubscriber(chatId: number): boolean {
  const subscribers = loadSubscribers();
  if (subscribers.includes(chatId)) return false;
  subscribers.push(chatId);
  saveSubscribers(subscribers);
  logger.info(`New subscriber added: chat_id=${chatId} (total: ${subscribers.length})`);
  return true;
}

export function removeSubscriber(chatId: number): boolean {
  const subscribers = loadSubscribers();
  const index = subscribers.indexOf(chatId);
  if (index === -1) return false;
  subscribers.splice(index, 1);
  saveSubscribers(subscribers);

  const names = loadSubscriberNames();
  delete names[String(chatId)];
  writeJson(config.subscriberNamesFile, names);

  logger.info(`Subscriber removed: chat_id=${chatId} (total: ${subscribers.length})`);
  return true;
}
