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
  readonly scheduleForm = signal<Pick<BotConfig, "dailyHour" | "dailyMinute" | "weeklyEveryDay"> | null>(null);
  readonly triggering = signal(false);
  readonly savingSchedule = signal(false);
  readonly scheduleSaved = signal(false);

  readonly editingName = signal<number | null>(null);
  editNameValue = "";

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  async ngOnInit() {
    const [subs, cfg] = await Promise.all([this.api.getSubscribers(), this.api.getConfig()]);
    this.subscribers.set(subs);
    this.scheduleForm.set({
      dailyHour: cfg.dailyHour,
      dailyMinute: cfg.dailyMinute,
      weeklyEveryDay: cfg.weeklyEveryDay,
    });
  }

  // ── Name editing ─────────────────────────────────────────────────────────

  startEdit(sub: Subscriber) {
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

  async toggleImages(sub: Subscriber) {
    sub.showImages = !sub.showImages;
    this.subscribers.update((s) => [...s]);
    await this.api.patchSubscriber(sub.chatId, { showImages: sub.showImages });
  }

  async toggleActive(sub: Subscriber) {
    sub.active = !sub.active;
    this.subscribers.update((s) => [...s]);
    await this.api.patchSubscriber(sub.chatId, { active: sub.active });
  }

  // ── Schedule ─────────────────────────────────────────────────────────────

  async saveSchedule() {
    const f = this.scheduleForm();
    if (!f) return;
    this.savingSchedule.set(true);
    this.scheduleSaved.set(false);
    try {
      await this.api.patchConfig({
        dailyHour: Number(f.dailyHour),
        dailyMinute: Number(f.dailyMinute),
        weeklyEveryDay: f.weeklyEveryDay,
      });
      this.scheduleSaved.set(true);
      setTimeout(() => this.scheduleSaved.set(false), 3000);
    } finally {
      this.savingSchedule.set(false);
    }
  }

  // ── Triggers ─────────────────────────────────────────────────────────────

  async triggerWeekly() {
    this.triggering.set(true);
    await this.api.triggerWeekly().finally(() => this.triggering.set(false));
  }

  async triggerDaily() {
    this.triggering.set(true);
    await this.api.triggerDaily().finally(() => this.triggering.set(false));
  }

  async logout() {
    await this.auth.logout();
    await this.router.navigate(["/login"]);
  }
}
