import cron from "node-cron";
import { createLogger } from "./logger.js";
import { getRuntimeSchedule, type ScheduleConfig } from "./runtimeConfig.js";
import { getSubscriberConfig } from "./subscriberConfig.js";
import { activeTargets, sendWeeklyDigest, sendTodaySpecial } from "./jobs.js";

const logger = createLogger("scheduler");

export interface ScheduledChat {
  chatId: number;
  schedule: ScheduleConfig;
}

export interface DueChats {
  weekly: number[];
  special: number[];
}

const pad = (n: number): string => {
  return String(n).padStart(2, "0");
};

const utcToPoland = (hour: number, minute: number): string => {
  const dt = new Date();
  dt.setUTCHours(hour, minute, 0, 0);
  return dt.toLocaleTimeString("en-GB", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
};

/** Today-special runs one minute after the weekly digest. */
export const specialTime = (hour: number, minute: number): { hour: number; minute: number } => {
  if (minute === 59) {
    return { hour: (hour + 1) % 24, minute: 0 };
  }
  return { hour, minute: minute + 1 };
};

/** Returns the chats whose weekly digest / today-special falls on the given UTC minute. */
export const computeDueChats = (now: Date, chats: ScheduledChat[]): DueChats => {
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const isMonday = now.getUTCDay() === 1;

  const due: DueChats = { weekly: [], special: [] };
  for (const { chatId, schedule } of chats) {
    const { dailyHour, dailyMinute, weeklyEveryDay } = schedule;
    if (hour === dailyHour && minute === dailyMinute && (weeklyEveryDay || isMonday)) {
      due.weekly.push(chatId);
    }
    const special = specialTime(dailyHour, dailyMinute);
    if (hour === special.hour && minute === special.minute) {
      due.special.push(chatId);
    }
  }
  return due;
};

const scheduledChats = (): ScheduledChat[] => {
  const global = getRuntimeSchedule();
  return activeTargets().map((chatId) => {
    const cfg = getSubscriberConfig(chatId);
    return {
      chatId,
      schedule: {
        dailyHour: cfg.dailyHour ?? global.dailyHour,
        dailyMinute: cfg.dailyMinute ?? global.dailyMinute,
        weeklyEveryDay: cfg.weeklyEveryDay ?? global.weeklyEveryDay,
      },
    };
  });
};

const tick = async (): Promise<void> => {
  try {
    const { weekly, special } = computeDueChats(new Date(), scheduledChats());
    if (weekly.length > 0) {
      await sendWeeklyDigest(weekly);
    }
    if (special.length > 0) {
      await sendTodaySpecial(special);
    }
  } catch (e) {
    logger.error(`Scheduler tick failed: ${e}`);
  }
};

export const startScheduler = (): void => {
  const { dailyHour: h, dailyMinute: m, weeklyEveryDay } = getRuntimeSchedule();
  const special = specialTime(h, m);
  logger.info(
    `Scheduler started — global weekly digest ${weeklyEveryDay ? "every day" : "Mondays only"} ` +
    `at ${pad(h)}:${pad(m)} UTC = ${utcToPoland(h, m)} Poland time, ` +
    `today-special at ${pad(special.hour)}:${pad(special.minute)} UTC = ` +
    `${utcToPoland(special.hour, special.minute)} Poland time (per-subscriber overrides apply)`,
  );
  cron.schedule("* * * * *", () => void tick(), { timezone: "UTC" });
};
