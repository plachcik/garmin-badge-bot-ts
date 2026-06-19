import express, { type Request, type Response, type NextFunction } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bot } from "../bot.js";
import { config } from "../config.js";
import { createLogger } from "../logger.js";
import { sendWeeklyDigest, sendTodaySpecial } from "../jobs.js";
import { loadSubscribers, loadSubscriberNames, saveSubscriberName } from "../subscribers.js";
import { getAllSubscriberConfigs, setSubscriberConfig } from "../subscriberConfig.js";
import { getRuntimeSchedule, setRuntimeSchedule } from "../runtimeConfig.js";
import { rescheduleJobs } from "../index.js";
import { generateCode, consumeCode, isValidSession, invalidateSession } from "./auth.js";

const logger = createLogger("api");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApiServer() {
  const app = express();
  app.use(express.json());

  // ── Auth middleware ──────────────────────────────────────────────────────

  function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token || !isValidSession(token)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  }

  // ── Auth routes ──────────────────────────────────────────────────────────

  app.post("/api/auth/request", async (_req: Request, res: Response): Promise<void> => {
    const code = generateCode();
    try {
      await bot.api.sendMessage(
        config.adminChatId,
        `🔐 Kod logowania do panelu admina:\n\n*${code}*\n\nWażny przez 5 minut\\.`,
        { parse_mode: "MarkdownV2" },
      );
      res.json({ ok: true });
    } catch (e) {
      logger.error(`Failed to send auth code: ${e}`);
      res.status(500).json({ error: "Failed to send code via Telegram" });
    }
  });

  app.post("/api/auth/verify", (req: Request, res: Response): void => {
    const { code } = req.body as { code?: string };
    if (!code) {
      res.status(400).json({ error: "Code required" });
      return;
    }
    const token = consumeCode(code);
    if (!token) {
      res.status(401).json({ error: "Invalid or expired code" });
      return;
    }
    res.json({ token });
  });

  app.post("/api/auth/logout", requireAuth, (req: Request, res: Response): void => {
    const token = req.headers.authorization!.replace("Bearer ", "");
    invalidateSession(token);
    res.json({ ok: true });
  });

  // ── Subscriber routes ────────────────────────────────────────────────────

  app.get("/api/subscribers", requireAuth, (_req: Request, res: Response): void => {
    const ids = loadSubscribers();
    const names = loadSubscriberNames();
    const configs = getAllSubscriberConfigs();
    const subscribers = ids.map((id) => ({
      chatId: id,
      name: names[String(id)] ?? String(id),
      showImages: configs[String(id)]?.showImages ?? config.showBadgeImage,
      active: configs[String(id)]?.active ?? true,
    }));
    res.json(subscribers);
  });

  app.patch("/api/subscribers/:chatId", requireAuth, (req: Request, res: Response): void => {
    const chatId = parseInt(req.params["chatId"]!, 10);
    if (isNaN(chatId)) {
      res.status(400).json({ error: "Invalid chatId" });
      return;
    }
    const { showImages, active, name } = req.body as {
      showImages?: boolean;
      active?: boolean;
      name?: string;
    };
    const patch: Record<string, boolean> = {};
    if (typeof showImages === "boolean") patch["showImages"] = showImages;
    if (typeof active === "boolean") patch["active"] = active;
    if (Object.keys(patch).length > 0) setSubscriberConfig(chatId, patch);
    if (typeof name === "string" && name.trim()) saveSubscriberName(chatId, name.trim());
    res.json({ ok: true });
  });

  // ── Config routes ────────────────────────────────────────────────────────

  app.get("/api/config", requireAuth, (_req: Request, res: Response): void => {
    const schedule = getRuntimeSchedule();
    res.json({
      showBadgeImage: config.showBadgeImage,
      weeklyEveryDay: schedule.weeklyEveryDay,
      dailyHour: schedule.dailyHour,
      dailyMinute: schedule.dailyMinute,
    });
  });

  app.patch("/api/config", requireAuth, (req: Request, res: Response): void => {
    const { dailyHour, dailyMinute, weeklyEveryDay } = req.body as {
      dailyHour?: number;
      dailyMinute?: number;
      weeklyEveryDay?: boolean;
    };
    const patch: Partial<{ dailyHour: number; dailyMinute: number; weeklyEveryDay: boolean }> = {};
    if (typeof dailyHour === "number" && dailyHour >= 0 && dailyHour <= 23) patch.dailyHour = dailyHour;
    if (typeof dailyMinute === "number" && dailyMinute >= 0 && dailyMinute <= 59) patch.dailyMinute = dailyMinute;
    if (typeof weeklyEveryDay === "boolean") patch.weeklyEveryDay = weeklyEveryDay;
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }
    const updated = setRuntimeSchedule(patch);
    rescheduleJobs();
    res.json({ ok: true, schedule: updated });
  });

  // ── Trigger routes ───────────────────────────────────────────────────────

  app.post("/api/triggers/weekly", requireAuth, (_req: Request, res: Response): void => {
    logger.info("Manual trigger: weekly digest");
    void sendWeeklyDigest();
    res.json({ ok: true });
  });

  app.post("/api/triggers/daily", requireAuth, (_req: Request, res: Response): void => {
    logger.info("Manual trigger: daily special");
    void sendTodaySpecial();
    res.json({ ok: true });
  });

  // ── Static frontend ──────────────────────────────────────────────────────

  const publicDir = path.resolve(__dirname, "../../public");
  app.use(express.static(publicDir));
  app.get("*", (_req: Request, res: Response): void => {
    res.sendFile(path.join(publicDir, "index.html"));
  });

  return app;
}

export function startApiServer(): void {
  const app = createApiServer();
  app.listen(config.apiPort, () => {
    logger.info(`API server listening on port ${config.apiPort}`);
  });
}
