import {createLogger} from "./logger.js";
import type {Badge, BadgeUpdates} from "./types.js";

const logger = createLogger("garminClient");
const BADGES_API = "https://api.garminbadges.com/api/badges";

const fetchAll = async (): Promise<Badge[]> => {
    const res = await fetch(BADGES_API, {signal: AbortSignal.timeout(15_000)});
    if (!res.ok) throw new Error(`Badges API returned ${res.status}`);
    return res.json() as Promise<Badge[]>;
};

const parseDate = (s: string): Date => {
    return new Date(s.slice(0, 19));
};

const isAvailableInPoland = (badge: Badge): boolean => {
    const countries = badge.countries ?? [];
    return countries.length === 0 || countries.some((c) => c.id === "PL");
};

const isGarminInName = (name: string): boolean => {
    return name.toLowerCase().includes("garmin");
};

export const fetchBadgeUpdates = async (): Promise<BadgeUpdates> => {
    const badges = await fetchAll();

    const now = new Date();
    const weekMonday = new Date(now);
    weekMonday.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    weekMonday.setHours(0, 0, 0, 0);
    const weekSunday = new Date(weekMonday);
    weekSunday.setDate(weekMonday.getDate() + 6);
    weekSunday.setHours(23, 59, 59, 999);

    const available = badges
        .filter((b) => {
            if (b.premium) {
                return false;
            }
            if (!isAvailableInPoland(b)) {
                return false;
            }
            if (!b.end_date) {
                return false;
            }
            if (isGarminInName(b.name)) {
                return false;
            }
            try {
                const endDt = parseDate(b.end_date);
                return endDt >= weekMonday && endDt <= weekSunday;
            } catch {
                return false;
            }
        })
        .sort((a, b) => (a.end_date ?? "9999").localeCompare(b.end_date ?? "9999"));

    logger.info(`Available badges this week: ${available.length}`);
    return {availableChallenges: available};
};

export const fetchSingleDayBadges = async (targetDate?: Date): Promise<Badge[]> => {
    const badges = await fetchAll();
    const target = targetDate ?? new Date();

    const result = badges.filter((b) => {
        if (b.premium) return false;
        if (!isAvailableInPoland(b)) return false;
        if (!b.start_date || !b.end_date) return false;
        try {
            const startDt = parseDate(b.start_date);
            const endDt = parseDate(b.end_date);
            const sameDay =
                startDt.getMonth() === endDt.getMonth() && startDt.getDate() === endDt.getDate();
            const isTarget =
                startDt.getMonth() === target.getMonth() && startDt.getDate() === target.getDate();
            return sameDay && isTarget;
        } catch {
            return false;
        }
    });

    logger.info(`Single-day badges for ${target.toISOString().slice(0, 10)}: ${result.length}`);
    return result;
};
