import type { Badge } from "./types.js";

export const IMAGE_BASE_URL = "https://api.garminbadges.com/storage/badges/";

const DIFFICULTY_STARS: Record<number, string> = { 1: "⭐", 2: "⭐⭐", 3: "⭐⭐⭐" };

const MONTHS_PL = [
  "",
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
];

const ACTIVITY_LABELS: Record<string, string> = {
  cycling: "Jazda na rowerze",
  running: "Bieganie",
  swimming: "Pływanie",
  walking: "Spacer",
  hiking: "Trekking",
  yoga: "Joga",
  strength: "Trening siłowy",
  cardio: "Kardio",
  rowing: "Wioślarstwo",
  skiing: "Narciarstwo",
  golf: "Golf",
  tennis: "Tenis",
  climbing: "Wspinaczka",
  paddling: "Kajakarstwo",
  surfing: "Surfing",
};

/** Escape special characters for Telegram MarkdownV2. */
export function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!\-\\]/g, (ch) => `\\${ch}`);
}

export function badgeImageUrl(badge: Badge): string | null {
  return badge.image_path ? `${IMAGE_BASE_URL}${badge.image_path}` : null;
}

function formatDatePl(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const dt = new Date(dateStr.slice(0, 19));
    return `${dt.getDate()} ${MONTHS_PL[dt.getMonth() + 1]}`;
  } catch {
    return dateStr;
  }
}

function extractActivityLabel(desc: string): string | null {
  for (const [keyword, label] of Object.entries(ACTIVITY_LABELS)) {
    if (desc.includes(keyword)) return label;
  }
  return null;
}

export function formatGoal(badge: Badge): string {
  const targetStr = badge.target_value;
  const desc = (badge.description ?? "").toLowerCase();

  if (!targetStr) {
    if (desc.startsWith("record an activity")) return "Dowolna aktywność";
    return extractActivityLabel(desc) ?? "";
  }

  const target = parseFloat(targetStr);
  let formatted: string;

  if (desc.includes("step")) {
    formatted = `${Math.round(target).toLocaleString("en-US")} kroków`;
  } else if (desc.includes("calorie") || desc.includes("kcal")) {
    formatted = `${Math.round(target).toLocaleString("en-US")} kcal`;
  } else if ((desc.includes("hour") || desc.includes("time")) && target >= 3600) {
    const hours = target / 3600;
    formatted = `${Number.isInteger(hours) ? hours.toFixed(0) : hours.toFixed(1)} h`;
  } else if (desc.includes("kilometer")) {
    formatted = `${Math.round(target >= 1000 ? target / 1000 : target)} km`;
  } else if (desc.includes("meter")) {
    formatted = target >= 1000 ? `${Math.round(target / 1000)} km` : `${Math.round(target)} m`;
  } else {
    formatted = Number.isInteger(target) ? String(Math.round(target)) : targetStr.replace(/\.?0+$/, "");
  }

  const assoc =
    desc.includes(" activity") && !desc.includes("activities") ? "jedna aktywność" : "łącznie";
  return `${formatted} (${assoc})`;
}

function buildDateLine(badge: Badge): string {
  const startStr = badge.start_date;
  const endStr = badge.end_date;
  const startFmt = formatDatePl(startStr);
  const endFmt = formatDatePl(endStr);

  if (!startFmt || !endFmt) {
    return endFmt ? `⏰ ${escapeMarkdownV2(`Kończy się ${endFmt}`)}` : "";
  }

  try {
    const startDt = new Date(startStr!.slice(0, 19));
    const endDt = new Date(endStr!.slice(0, 19));
    const sameDay = startDt.getMonth() === endDt.getMonth() && startDt.getDate() === endDt.getDate();

    if (sameDay) {
      return `⏰ ${escapeMarkdownV2(`Wyzwanie tylko ${endFmt}!`)}`;
    }

    const started = startDt < new Date();
    const verb = started ? "Wyzwanie zaczęło się" : "Wyzwanie zaczyna się";
    return `⏰ ${escapeMarkdownV2(`${verb} ${startFmt} a kończy ${endFmt}`)}`;
  } catch {
    return "";
  }
}

/** Caption for a photo message (no bullet, no indent). */
export function badgeCaption(
  badge: Badge,
  opts: { todayOnly?: boolean; tomorrowOnly?: boolean } = {},
): string {
  const name = badge.name ?? "Unknown";
  const stars = DIFFICULTY_STARS[badge.difficulty_id] ?? "";
  const goal = formatGoal(badge);

  const lines: string[] = [`*${escapeMarkdownV2(name)}* ${stars}`];
  if (goal) lines.push(`🎯 ${escapeMarkdownV2(goal)}`);

  if (opts.tomorrowOnly) {
    lines.push("⏰ Tylko jutro\\!\\!");
  } else if (opts.todayOnly) {
    lines.push("⏰ Tylko dziś\\!\\! Rusz dupę\\!\\!");
  } else {
    const dateLine = buildDateLine(badge);
    if (dateLine) lines.push(dateLine);
  }

  return lines.join("\n");
}

/** Text line for use in list messages. */
function badgeLine(badge: Badge, opts: { todayOnly?: boolean; tomorrowOnly?: boolean } = {}): string {
  const name = badge.name ?? "Unknown";
  const stars = DIFFICULTY_STARS[badge.difficulty_id] ?? "";
  const goal = formatGoal(badge);

  const lines: string[] = [`• *${escapeMarkdownV2(name)}* ${stars}`];
  if (goal) lines.push(`  🎯 ${escapeMarkdownV2(goal)}`);

  if (opts.tomorrowOnly) {
    lines.push("  ⏰ Tylko jutro\\!\\!");
  } else if (opts.todayOnly) {
    lines.push("  ⏰ Tylko dziś\\!\\! Rusz dupę\\!\\!");
  } else {
    const dateLine = buildDateLine(badge);
    if (dateLine) lines.push(`  ${dateLine}`);
  }

  return lines.join("\n");
}

// ── Headers ─────────────────────────────────────────────────────────────────

export function weeklyDigestHeader(custom?: string): string {
  return custom ?? "👋🏻 *Żeby nie umknęło\\!*\n\n*Dostępne odznaki w tym tygodniu:*";
}

export function todaySpecialHeader(): string {
  return "Żeby nie umknęło 💡\n\n*📅 Dostępne odznaki tylko na dziś:*";
}

export function tomorrowSpecialHeader(): string {
  return "Jutro nie zapomnij 👀\n\n*📅 Odznaki dostępne tylko jutro:*";
}

// ── Full text messages ───────────────────────────────────────────────────────

export function buildWeeklyMessage(badges: Badge[], header?: string): string {
  const headerLine = header ?? "👋🏻 *Żeby nie umknęło\\!*";

  if (badges.length === 0) {
    return `${headerLine}\n\nBrak aktywnych wyzwań w tym tygodniu\\. Ruszaj się\\! 🚶`;
  }

  const lines = [headerLine];
  if (!header) lines.push("*Dostępne odznaki w tym tygodniu:*\n");
  for (const b of badges) lines.push(badgeLine(b));
  return lines.join("\n");
}

export function buildTodaySpecialMessage(badges: Badge[]): string {
  return [
    "Żeby nie umknęło 💡\n",
    "*📅 Dostępne odznaki tylko na dziś:*\n",
    ...badges.map((b) => badgeLine(b, { todayOnly: true })),
  ].join("\n");
}

export function buildTomorrowSpecialMessage(badges: Badge[]): string {
  return [
    "Jutro nie zapomnij 👀\n",
    "*📅 Odznaki dostępne tylko jutro:*\n",
    ...badges.map((b) => badgeLine(b, { tomorrowOnly: true })),
  ].join("\n");
}
