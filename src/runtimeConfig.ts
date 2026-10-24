import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

export interface ScheduleConfig {
  dailyHour: number;
  dailyMinute: number;
  weeklyEveryDay: boolean;
}

const filePath = (): string => {
  return path.join(config.dataDir, "runtime-config.json");
};

const read = (): Partial<ScheduleConfig> => {
  const f = filePath();
  if (!fs.existsSync(f)) return {};
  return JSON.parse(fs.readFileSync(f, "utf-8")) as Partial<ScheduleConfig>;
};

const write = (data: Partial<ScheduleConfig>): void => {
  fs.writeFileSync(filePath(), JSON.stringify(data, null, 2), "utf-8");
};

export const getRuntimeSchedule = (): ScheduleConfig => {
  const saved = read();
  return {
    dailyHour: saved.dailyHour ?? config.dailyHour,
    dailyMinute: saved.dailyMinute ?? config.dailyMinute,
    weeklyEveryDay: saved.weeklyEveryDay ?? config.weeklyEveryDay,
  };
};

export const setRuntimeSchedule = (patch: Partial<ScheduleConfig>): ScheduleConfig => {
  const current = read();
  const updated = { ...current, ...patch };
  write(updated);
  return getRuntimeSchedule();
};
