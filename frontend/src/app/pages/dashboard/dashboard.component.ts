import { Component, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/auth.service.js";
import { ApiService, Subscriber, BotConfig } from "../../core/api.service.js";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./dashboard.component.html",
})
export class DashboardComponent implements OnInit {
  readonly subscribers = signal<Subscriber[]>([]);
  readonly globalSchedule = signal<Pick<BotConfig, "dailyHour" | "dailyMinute" | "weeklyEveryDay"> | null>(null);
  readonly expandedId = signal<number | null>(null);

  readonly editingName = signal<number | null>(null);
  editNameValue = "";

  readonly savingSchedule = signal<number | "global" | null>(null);
  readonly savedSchedule = signal<number | "global" | null>(null);
  readonly triggeringFor = signal<number | "all" | null>(null);

  newChatId = "";
  newName = "";
  readonly addingSubscriber = signal(false);
  readonly addError = signal("");

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  async ngOnInit() {
    const [subs, cfg] = await Promise.all([this.api.getSubscribers(), this.api.getConfig()]);
    this.subscribers.set(subs);
    this.globalSchedule.set({ dailyHour: cfg.dailyHour, dailyMinute: cfg.dailyMinute, weeklyEveryDay: cfg.weeklyEveryDay });
  }

  // ── Accordion ─────────────────────────────────────────────────────────────

  toggleExpand(chatId: number) {
    this.expandedId.set(this.expandedId() === chatId ? null : chatId);
    this.editingName.set(null);
  }

  // ── Name editing ─────────────────────────────────────────────────────────

  startEdit(sub: Subscriber, event: Event) {
    event.stopPropagation();
    this.editingName.set(sub.chatId);
    this.editNameValue = sub.name;
  }

  cancelEdit() {
    this.editingName.set(null);
  }

  async saveName(sub: Subscriber) {
    const name = this.editNameValue.trim();
    this.editingName.set(null);
    if (!name || name === sub.name) return;
    sub.name = name;
    this.subscribers.update((s) => [...s]);
    await this.api.patchSubscriber(sub.chatId, { name });
  }

  // ── Toggles ──────────────────────────────────────────────────────────────

  async toggleImages(sub: Subscriber, event: Event) {
    event.stopPropagation();
    sub.showImages = !sub.showImages;
    this.subscribers.update((s) => [...s]);
    await this.api.patchSubscriber(sub.chatId, { showImages: sub.showImages });
  }

  async toggleActive(sub: Subscriber, event: Event) {
    event.stopPropagation();
    sub.active = !sub.active;
    this.subscribers.update((s) => [...s]);
    await this.api.patchSubscriber(sub.chatId, { active: sub.active });
  }

  // ── Per-subscriber schedule ───────────────────────────────────────────────

  async saveSubscriberSchedule(sub: Subscriber) {
    this.savingSchedule.set(sub.chatId);
    try {
      await this.api.patchSubscriber(sub.chatId, {
        dailyHour: Number(sub.dailyHour),
        dailyMinute: Number(sub.dailyMinute),
        weeklyEveryDay: sub.weeklyEveryDay,
      });
      this.savedSchedule.set(sub.chatId);
      setTimeout(() => this.savedSchedule.set(null), 2500);
    } finally {
      this.savingSchedule.set(null);
    }
  }

  // ── Global schedule ───────────────────────────────────────────────────────

  async saveGlobalSchedule() {
    const f = this.globalSchedule();
    if (!f) return;
    this.savingSchedule.set("global");
    try {
      await this.api.patchConfig({ dailyHour: Number(f.dailyHour), dailyMinute: Number(f.dailyMinute), weeklyEveryDay: f.weeklyEveryDay });
      this.savedSchedule.set("global");
      setTimeout(() => this.savedSchedule.set(null), 2500);
    } finally {
      this.savingSchedule.set(null);
    }
  }

  // ── Triggers ─────────────────────────────────────────────────────────────

  async triggerWeeklyFor(sub: Subscriber) {
    this.triggeringFor.set(sub.chatId);
    await this.api.triggerWeeklyFor(sub.chatId).finally(() => this.triggeringFor.set(null));
  }

  async triggerDailyFor(sub: Subscriber) {
    this.triggeringFor.set(sub.chatId);
    await this.api.triggerDailyFor(sub.chatId).finally(() => this.triggeringFor.set(null));
  }

  async triggerWeeklyAll() {
    this.triggeringFor.set("all");
    await this.api.triggerWeekly().finally(() => this.triggeringFor.set(null));
  }

  async triggerDailyAll() {
    this.triggeringFor.set("all");
    await this.api.triggerDaily().finally(() => this.triggeringFor.set(null));
  }

  // ── Add subscriber ────────────────────────────────────────────────────────

  async addSubscriber() {
    const chatId = parseInt(this.newChatId.trim(), 10);
    if (isNaN(chatId)) { this.addError.set("Nieprawidłowe ID czatu."); return; }
    this.addingSubscriber.set(true);
    this.addError.set("");
    try {
      await this.api.addSubscriber(chatId, this.newName.trim() || undefined);
      const subs = await this.api.getSubscribers();
      this.subscribers.set(subs);
      this.newChatId = "";
      this.newName = "";
    } catch {
      this.addError.set("Nie udało się dodać subskrybenta.");
    } finally {
      this.addingSubscriber.set(false);
    }
  }

  async removeSubscriber(sub: Subscriber, event: Event) {
    event.stopPropagation();
    await this.api.deleteSubscriber(sub.chatId);
    this.subscribers.update((s) => s.filter((x) => x.chatId !== sub.chatId));
    if (this.expandedId() === sub.chatId) this.expandedId.set(null);
  }

  async logout() {
    await this.auth.logout();
    await this.router.navigate(["/login"]);
  }
}
