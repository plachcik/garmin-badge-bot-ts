import cron from "node-cron";
import { createLogger } from "./logger.js";
import { getRuntimeSchedule } from "./runtimeConfig.js";
import { sendWeeklyDigest, sendTodaySpecial } from "./jobs.js";
import type { ScheduledTask } from "node-cron";

const logger = createLogger("scheduler");

let _weeklyTask: ScheduledTask | null = null;
let _specialTask: ScheduledTask | null = null;

function utcToPoland(hour: number, minute: number): { hour: number; minute: number } {
  const now = new Date();
  now.setUTCHours(hour, minute, 0, 0);
  return {
    hour: now.toLocaleString("en-US", { timeZone: "Europe/Warsaw", hour: "numeric", hour12: false }) as unknown as number,
    minute: parseInt(now.toLocaleString("en-US", { timeZone: "Europe/Warsaw", minute: "numeric" })),
  };
}

export function rescheduleJobs(): void {
  _weeklyTask?.stop();
  _specialTask?.stop();

  const { dailyHour: h, dailyMinute: m, weeklyEveryDay } = getRuntimeSchedule();
  const sm = (m + 1) % 60;
  const sh = m === 59 ? h + 1 : h;

  const weeklyPattern = weeklyEveryDay ? `${m} ${h} * * *` : `${m} ${h} * * 1`;
  const specialPattern = `${sm} ${sh} * * *`;

  const polandWeekly = utcToPoland(h, m);
  const polandSpecial = utcToPoland(sh, sm);
  logger.info(
    `Scheduler (re)started — weekly digest ${weeklyEveryDay ? "every day" : "Mondays only"} ` +
    `at ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} UTC = ` +
    `${String(polandWeekly.hour).padStart(2, "0")}:${String(polandWeekly.minute).padStart(2, "0")} Poland time, ` +
    `today-special at ${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")} UTC = ` +
    `${String(polandSpecial.hour).padStart(2, "0")}:${String(polandSpecial.minute).padStart(2, "0")} Poland time`,
  );

  _weeklyTask = cron.schedule(weeklyPattern, () => void sendWeeklyDigest(), { timezone: "UTC" });
  _specialTask = cron.schedule(specialPattern, () => void sendTodaySpecial(), { timezone: "UTC" });
}
