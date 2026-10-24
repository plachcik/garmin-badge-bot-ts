import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { AuthService } from "./auth.service.js";

export interface SubscriberSchedule {
  dailyHour?: number;
  dailyMinute?: number;
  weeklyEveryDay?: boolean;
}

export interface Subscriber {
  chatId: number;
  name: string;
  showImages: boolean;
  active: boolean;
  dailyHour?: number;
  dailyMinute?: number;
  weeklyEveryDay?: boolean;
}

export interface BotConfig {
  showBadgeImage: boolean;
  weeklyEveryDay: boolean;
  dailyHour: number;
  dailyMinute: number;
}

export interface BadgeItem {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  difficulty: number;
  startDate: string | null;
  endDate: string | null;
  ignored: boolean;
}

export interface SentBadgeItem extends BadgeItem {
  kind: "weekly" | "today" | "tomorrow";
  sentAt: string;
}

export interface BadgesOverview {
  upcoming: {
    weeklyAt: string;
    dailyAt: string;
    weekly: BadgeItem[];
    today: BadgeItem[];
    tomorrow: BadgeItem[];
  };
  recentlySent: SentBadgeItem[];
  all: BadgeItem[];
}

@Injectable({ providedIn: "root" })
export class ApiService {
  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {}

  private get headers() {
    return { headers: this.auth.authHeaders() };
  }

  getSubscribers(): Promise<Subscriber[]> {
    return firstValueFrom(this.http.get<Subscriber[]>("/api/subscribers", this.headers));
  }

  addSubscriber(chatId: number, name?: string) {
    return firstValueFrom(this.http.post("/api/subscribers", { chatId, name }, this.headers));
  }

  deleteSubscriber(chatId: number) {
    return firstValueFrom(this.http.delete(`/api/subscribers/${chatId}`, this.headers));
  }

  patchSubscriber(
    chatId: number,
    patch: Partial<Pick<Subscriber, "showImages" | "active" | "dailyHour" | "dailyMinute" | "weeklyEveryDay"> & { name: string }>,
  ) {
    return firstValueFrom(this.http.patch(`/api/subscribers/${chatId}`, patch, this.headers));
  }

  getConfig(): Promise<BotConfig> {
    return firstValueFrom(this.http.get<BotConfig>("/api/config", this.headers));
  }

  patchConfig(patch: Partial<Pick<BotConfig, "dailyHour" | "dailyMinute" | "weeklyEveryDay">>) {
    return firstValueFrom(this.http.patch("/api/config", patch, this.headers));
  }

  triggerWeekly() {
    return firstValueFrom(this.http.post("/api/triggers/weekly", {}, this.headers));
  }

  triggerDaily() {
    return firstValueFrom(this.http.post("/api/triggers/daily", {}, this.headers));
  }

  triggerWeeklyFor(chatId: number) {
    return firstValueFrom(this.http.post(`/api/triggers/weekly/${chatId}`, {}, this.headers));
  }

  triggerDailyFor(chatId: number) {
    return firstValueFrom(this.http.post(`/api/triggers/daily/${chatId}`, {}, this.headers));
  }

  getBadges(): Promise<BadgesOverview> {
    return firstValueFrom(this.http.get<BadgesOverview>("/api/badges", this.headers));
  }

  setBadgeIgnored(badgeId: number, ignored: boolean) {
    return firstValueFrom(this.http.put(`/api/badges/${badgeId}/ignore`, { ignored }, this.headers));
  }
}
