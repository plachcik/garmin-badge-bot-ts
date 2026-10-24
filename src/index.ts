import { type Context } from "grammy";
import { bot } from "./bot.js";
import { config } from "./config.js";
import { createLogger } from "./logger.js";
import { fetchBadgeUpdates, fetchSingleDayBadges } from "./garminClient.js";
import {
  badgeCaption,
  badgeImageUrl,
  buildWeeklyMessage,
  buildTodaySpecialMessage,
  todaySpecialHeader,
  weeklyDigestHeader,
} from "./messageBuilder.js";
import {
  addSubscriber,
  loadSubscriberNames,
  loadSubscribers,
  removeSubscriber,
  saveSubscriberName,
} from "./subscribers.js";
import { notifyAdminError } from "./jobs.js";
import { startApiServer } from "./api/server.js";
import { startScheduler } from "./scheduler.js";
const logger = createLogger("bot");

// ── Helpers ──────────────────────────────────────────────────────────────────

const sendLongMessage = async (
  sendFn: (text: string, extra?: Record<string, unknown>) => Promise<unknown>,
  text: string,
): Promise<void> => {
  const limit = 4000;
  let remaining = text;
  while (remaining.length > 0) {
    const chunk = remaining.slice(0, limit);
    remaining = remaining.slice(limit);
    await sendFn(chunk, { parse_mode: "MarkdownV2" });
  }
};

// ── Command handlers ──────────────────────────────────────────────────────────

bot.command(["start", "subscribe", "dawaj_odznaki"], async (ctx: Context) => {
  const chatId = ctx.chat!.id;
  logger.info(`Received subscribe command from chat_id=${chatId}`);
  const newlyAdded = addSubscriber(chatId);
  if (newlyAdded) {
    const chat = await bot.api.getChat(chatId);
    const title = "title" in chat ? chat.title : null;
    const fullName = "first_name" in chat
      ? [chat.first_name, "last_name" in chat ? chat.last_name : null].filter(Boolean).join(" ")
      : null;
    const username = "username" in chat && chat.username ? chat.username : null;
    let display = title ?? fullName ?? String(chatId);
    if (username) display = `${display} (@${username})`;
    saveSubscriberName(chatId, display);
    logger.info(`Subscribed new chat_id=${chatId} to scheduled digests`);
    await ctx.reply(
      "✅ Zapisano! Będziesz otrzymywać powiadomienia o dostępnych odznakach.\n\n" +
      "Komendy:\n" +
      "/odznaki — sprawdź odznaki teraz\n" +
      "/unsubscribe — wypisz się z powiadomień",
    );
  } else {
    await ctx.reply(
      "👍 Już jesteś zapisany na powiadomienia!\n\n" +
      "Komendy:\n" +
      "/odznaki — sprawdź odznaki teraz\n" +
      "/unsubscribe — wypisz się z powiadomień",
    );
  }
});

bot.command("unsubscribe", async (ctx: Context) => {
  const chatId = ctx.chat!.id;
  logger.info(`Received unsubscribe command from chat_id=${chatId}`);
  const removed = removeSubscriber(chatId);
  if (removed) {
    await ctx.reply(
      "👋🏻 Wypisano! Szkoda że nie chcesz już być fitnesiakiem 😒\n\n" +
      "Możesz zapisać się ponownie używając /dawaj_odznaki.",
    );
  } else {
    await ctx.reply("ℹ️ Nie jesteś zapisany na powiadomienia.");
  }
});

bot.command("odznaki", async (ctx: Context) => {
  const user = ctx.from;
  logger.info(`Badge check triggered by user: ${user?.username ?? user?.first_name} (id=${user?.id})`);
  await ctx.reply("⏳ Sprawdzam odznaki\\.\\.\\.", { parse_mode: "MarkdownV2" });

  try {
    const { availableChallenges } = await fetchBadgeUpdates();
    if (config.showBadgeImage && availableChallenges.length > 0) {
      await ctx.reply(weeklyDigestHeader("👋🏻 *Dostępne odznaki w tym tygodniu:*"), {
        parse_mode: "MarkdownV2",
      });
      for (const badge of availableChallenges) {
        const caption = badgeCaption(badge);
        const url = badgeImageUrl(badge);
        try {
          if (url) {
            await bot.api.sendPhoto(ctx.chat!.id, url, { caption, parse_mode: "MarkdownV2" });
          } else {
            await ctx.reply(caption, { parse_mode: "MarkdownV2" });
          }
        } catch {
          await ctx.reply(caption, { parse_mode: "MarkdownV2" });
        }
      }
    } else {
      await sendLongMessage(
        (text, extra) => ctx.reply(text, extra as Parameters<typeof ctx.reply>[1]),
        buildWeeklyMessage(availableChallenges, "👋🏻 *Dostępne odznaki w tym tygodniu:*"),
      );
    }

    const todayBadges = await fetchSingleDayBadges();
    if (todayBadges.length > 0) {
      if (config.showBadgeImage) {
        await ctx.reply(todaySpecialHeader(), { parse_mode: "MarkdownV2" });
        for (const badge of todayBadges) {
          const caption = badgeCaption(badge, { todayOnly: true });
          const url = badgeImageUrl(badge);
          try {
            if (url) {
              await bot.api.sendPhoto(ctx.chat!.id, url, { caption, parse_mode: "MarkdownV2" });
            } else {
              await ctx.reply(caption, { parse_mode: "MarkdownV2" });
            }
          } catch {
            await ctx.reply(caption, { parse_mode: "MarkdownV2" });
          }
        }
      } else {
        await sendLongMessage(
          (text, extra) => ctx.reply(text, extra as Parameters<typeof ctx.reply>[1]),
          buildTodaySpecialMessage(todayBadges),
        );
      }
    }
  } catch (e) {
    logger.error(`cmd_check error: ${e}`);
    await ctx.reply(`⚠️ Error: ${e}`);
    await notifyAdminError(e);
  }
});

bot.command("show_subscribers", async (ctx: Context) => {
  if (ctx.chat!.id !== config.adminChatId) return;
  const subscribers = loadSubscribers();
  const names = loadSubscriberNames();
  if (subscribers.length === 0) {
    await ctx.reply("Brak subskrybentów.");
    return;
  }
  const lines = [
    `👥 Subskrybenci (${subscribers.length}):`,
    ...subscribers.map((id) => `• ${names[String(id)] ?? id} (id=${id})`),
  ];
  await ctx.reply(lines.join("\n"));
});

// Forward free-text messages from private chats to admin
bot.on("message:text", async (ctx: Context) => {
  if (ctx.chat?.type !== "private") return;
  if (ctx.message && "text" in ctx.message) {
    const msg = ctx.message;
    const text = msg.text;
    if (!text || text.startsWith("/")) return; // ignore commands
    const user = ctx.from;
    const name = user
      ? [user.first_name, user.last_name].filter(Boolean).join(" ") || String(user.id)
      : "Unknown";
    const username = user?.username ? ` (@${user.username})` : "";
    const notify = `💬 Wiadomość od ${name}${username}:\n\n${text}`;
    try {
      await bot.api.sendMessage(config.adminChatId, notify);
    } catch (e) {
      logger.error(`Failed to forward user message to admin: ${e}`);
    }
  }
});

// ── Startup ───────────────────────────────────────────────────────────────────

const logSubscribers = async (): Promise<void> => {
  const subscribers = loadSubscribers();
  if (subscribers.length === 0) {
    logger.info(`No subscribers yet — will fall back to ADMIN_TELEGRAM_CHAT_ID=${config.adminChatId}`);
    return;
  }
  logger.info(`Subscribers (${subscribers.length}):`);
  for (const chatId of subscribers) {
    try {
      const chat = await bot.api.getChat(chatId);
      const title = "title" in chat ? chat.title : null;
      const fullName = "first_name" in chat
        ? [chat.first_name, "last_name" in chat ? chat.last_name : null].filter(Boolean).join(" ")
        : null;
      const username = "username" in chat && chat.username ? chat.username : null;
      let display = title ?? fullName ?? String(chatId);
      if (username) display = `${display} (@${username})`;
      logger.info(`  • ${display} (id=${chatId})`);
      saveSubscriberName(chatId, display);
    } catch (e) {
      logger.info(`  • [unknown] (id=${chatId}) — ${e}`);
    }
  }
};


// Without a handler grammY stops polling on the first error thrown by a handler
bot.catch((err) => {
  logger.error(`Error while handling update ${err.ctx.update.update_id}: ${err.error}`);
});

const main = async (): Promise<void> => {
  logger.info("Starting Garmin Badge Bot...");
  await logSubscribers();
  startScheduler();
  startApiServer();
  logger.info("Bot is running.");
  await bot.start({ drop_pending_updates: true });
};

main().catch((e) => {
  logger.error(`Fatal: ${e}`);
  process.exit(1);
});
