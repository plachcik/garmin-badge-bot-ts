import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { AuthService } from "./auth.service.js";

export interface Subscriber {
  chatId: number;
  name: string;
  showImages: boolean;
  active: boolean;
}

export interface BotConfig {
  showBadgeImage: boolean;
  weeklyEveryDay: boolean;
  dailyHour: number;
  dailyMinute: number;
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

  patchSubscriber(
    chatId: number,
    patch: Partial<Pick<Subscriber, "showImages" | "active"> & { name: string }>,
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
}
