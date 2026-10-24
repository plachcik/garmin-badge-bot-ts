import { bot } from "./bot.js";
import { config } from "./config.js";
import { createLogger } from "./logger.js";
import { fetchBadgeUpdates, fetchSingleDayBadges } from "./garminClient.js";
import {
  badgeCaption,
  badgeImageUrl,
  buildWeeklyMessage,
  buildTodaySpecialMessage,
  buildTomorrowSpecialMessage,
  todaySpecialHeader,
  tomorrowSpecialHeader,
  weeklyDigestHeader,
} from "./messageBuilder.js";
import { loadSubscribers } from "./subscribers.js";
import { getSubscriberConfig } from "./subscriberConfig.js";
import { withoutIgnored } from "./ignoredBadges.js";
import { recordSentBadges } from "./sentBadges.js";
import type { Badge } from "./types.js";

const logger = createLogger("jobs");

export const notifyAdminError = async (error: unknown): Promise<void> => {
  try {
    await bot.api.sendMessage(config.adminChatId, `⚠️ Garmin badges API error\n\n${String(error)}`);
  } catch (e) {
    logger.error(`Failed to send admin error notification: ${e}`);
  }
};

const sendLongText = async (chatId: number, text: string): Promise<void> => {
  const limit = 4000;
  let remaining = text;
  while (remaining.length > 0) {
    await bot.api.sendMessage(chatId, remaining.slice(0, limit), { parse_mode: "MarkdownV2" });
    remaining = remaining.slice(limit);
  }
};

const sendPhotos = async (
  chatId: number,
  header: string,
  badges: Badge[],
  opts: { todayOnly?: boolean; tomorrowOnly?: boolean },
): Promise<void> => {
  await bot.api.sendMessage(chatId, header, { parse_mode: "MarkdownV2" });
  for (const badge of badges) {
    const caption = badgeCaption(badge, opts);
    const url = badgeImageUrl(badge);
    try {
      if (url) {
        await bot.api.sendPhoto(chatId, url, { caption, parse_mode: "MarkdownV2" });
      } else {
        await bot.api.sendMessage(chatId, caption, { parse_mode: "MarkdownV2" });
      }
    } catch (e) {
      logger.warn(`Failed to send badge photo to ${chatId}: ${e} — falling back to text`);
      await bot.api.sendMessage(chatId, caption, { parse_mode: "MarkdownV2" });
    }
  }
};

const showImagesFor = (chatId: number): boolean => {
  return getSubscriberConfig(chatId).showImages ?? config.showBadgeImage;
};

/** Subscribers that receive scheduled messages; falls back to the admin chat when there are none. */
export const activeTargets = (): number[] => {
  const subscribers = loadSubscribers();
  if (subscribers.length === 0) {
    return [config.adminChatId];
  }
  return subscribers.filter((chatId) => getSubscriberConfig(chatId).active !== false);
};

const deliverWeekly = async (chatId: number, badges: Badge[]): Promise<void> => {
  if (showImagesFor(chatId) && badges.length > 0) {
    await sendPhotos(chatId, weeklyDigestHeader(), badges, {});
  } else {
    await sendLongText(chatId, buildWeeklyMessage(badges));
  }
};

const deliverSpecial = async (chatId: number, todayBadges: Badge[], tomorrowBadges: Badge[]): Promise<void> => {
  const showImages = showImagesFor(chatId);
  if (todayBadges.length > 0) {
    if (showImages) {
      await sendPhotos(chatId, todaySpecialHeader(), todayBadges, { todayOnly: true });
    } else {
      await sendLongText(chatId, buildTodaySpecialMessage(todayBadges));
    }
  }
  if (tomorrowBadges.length > 0) {
    if (showImages) {
      await sendPhotos(chatId, tomorrowSpecialHeader(), tomorrowBadges, { tomorrowOnly: true });
    } else {
      await sendLongText(chatId, buildTomorrowSpecialMessage(tomorrowBadges));
    }
  }
};

export const sendWeeklyDigest = async (chatIds: number[] = activeTargets()): Promise<void> => {
  if (chatIds.length === 0) {
    return;
  }
  logger.info(`Running weekly badge digest for chat_id(s): ${chatIds.join(", ")}`);
  try {
    const availableChallenges = withoutIgnored((await fetchBadgeUpdates()).availableChallenges);
    let delivered = false;
    for (const chatId of chatIds) {
      try {
        await deliverWeekly(chatId, availableChallenges);
        delivered = true;
      } catch (e) {
        logger.error(`Failed to send weekly digest to chat_id=${chatId}: ${e}`);
      }
    }
    if (delivered) {
      recordSentBadges(availableChallenges, "weekly");
    }
    logger.info("Weekly digest sent.");
  } catch (e) {
    logger.error(`Failed to send weekly digest: ${e}`);
    await notifyAdminError(e);
  }
};

export const sendTodaySpecial = async (chatIds: number[] = activeTargets()): Promise<void> => {
  if (chatIds.length === 0) {
    return;
  }
  logger.info(`Running today-special badge check for chat_id(s): ${chatIds.join(", ")}`);
  try {
    const todayBadges = withoutIgnored(await fetchSingleDayBadges());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowBadges = withoutIgnored(await fetchSingleDayBadges(tomorrow));

    if (todayBadges.length === 0 && tomorrowBadges.length === 0) {
      logger.info("No today/tomorrow-special badges.");
      return;
    }
    let delivered = false;
    for (const chatId of chatIds) {
      try {
        await deliverSpecial(chatId, todayBadges, tomorrowBadges);
        delivered = true;
      } catch (e) {
        logger.error(`Failed to send today-special to chat_id=${chatId}: ${e}`);
      }
    }
    if (delivered) {
      recordSentBadges(todayBadges, "today");
      recordSentBadges(tomorrowBadges, "tomorrow");
    }
    logger.info(
      `Today-special sent (today: ${todayBadges.length}, tomorrow: ${tomorrowBadges.length} badge(s)).`,
    );
  } catch (e) {
    logger.error(`Failed to send today-special badges: ${e}`);
    await notifyAdminError(e);
  }
};
