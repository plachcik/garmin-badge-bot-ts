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
import type { Badge } from "./types.js";

const logger = createLogger("jobs");

export async function notifyAdminError(error: unknown): Promise<void> {
  try {
    await bot.api.sendMessage(config.adminChatId, `⚠️ Garmin badges API error\n\n${String(error)}`);
  } catch (e) {
    logger.error(`Failed to send admin error notification: ${e}`);
  }
}

async function sendLongText(chatId: number, text: string): Promise<void> {
  const limit = 4000;
  let remaining = text;
  while (remaining.length > 0) {
    await bot.api.sendMessage(chatId, remaining.slice(0, limit), { parse_mode: "MarkdownV2" });
    remaining = remaining.slice(limit);
  }
}

async function sendPhotos(
  chatId: number,
  header: string,
  badges: Badge[],
  opts: { todayOnly?: boolean; tomorrowOnly?: boolean },
): Promise<void> {
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
}

async function broadcast(
  badges: Badge[],
  header: string,
  textMessage: string,
  opts: { todayOnly?: boolean; tomorrowOnly?: boolean } = {},
): Promise<void> {
  const subscribers = loadSubscribers();
  const targets = subscribers.length > 0 ? subscribers : [config.adminChatId];

  for (const chatId of targets) {
    const chatCfg = getSubscriberConfig(chatId);
    if (chatCfg.active === false) continue;
    const showImages = chatCfg.showImages ?? config.showBadgeImage;

    try {
      if (showImages && badges.length > 0) {
        await sendPhotos(chatId, header, badges, opts);
      } else {
        await sendLongText(chatId, textMessage);
      }
    } catch (e) {
      logger.error(`Failed to send to chat_id=${chatId}: ${e}`);
    }
  }
}

export async function sendWeeklyDigest(): Promise<void> {
  logger.info("Running weekly badge digest... [triggered by: scheduler]");
  try {
    const { availableChallenges } = await fetchBadgeUpdates();
    await broadcast(
      availableChallenges,
      weeklyDigestHeader(),
      buildWeeklyMessage(availableChallenges),
    );
    logger.info("Weekly digest sent.");
  } catch (e) {
    logger.error(`Failed to send weekly digest: ${e}`);
    await notifyAdminError(e);
  }
}

export async function sendTodaySpecial(): Promise<void> {
  logger.info("Running today-special badge check... [triggered by: scheduler]");
  try {
    const todayBadges = await fetchSingleDayBadges();
    if (todayBadges.length > 0) {
      await broadcast(todayBadges, todaySpecialHeader(), buildTodaySpecialMessage(todayBadges), {
        todayOnly: true,
      });
      logger.info(`Today-special message sent (${todayBadges.length} badge(s)).`);
    } else {
      logger.info("No today-special badges for today.");
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowBadges = await fetchSingleDayBadges(tomorrow);
    if (tomorrowBadges.length > 0) {
      await broadcast(
        tomorrowBadges,
        tomorrowSpecialHeader(),
        buildTomorrowSpecialMessage(tomorrowBadges),
        { tomorrowOnly: true },
      );
      logger.info(`Tomorrow-special message sent (${tomorrowBadges.length} badge(s)).`);
    } else {
      logger.info("No tomorrow-special badges.");
    }
  } catch (e) {
    logger.error(`Failed to send today-special badges: ${e}`);
    await notifyAdminError(e);
  }
}
