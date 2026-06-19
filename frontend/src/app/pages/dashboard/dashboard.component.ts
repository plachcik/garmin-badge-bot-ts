import { Component, OnInit, signal } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "../../core/auth.service.js";
import { ApiService, Subscriber, BotConfig } from "../../core/api.service.js";

@Component({
  selector: "app-dashboard",
  standalone: true,
  styles: [
    `
      .layout {
        max-width: 800px;
        margin: 0 auto;
        padding: 32px 20px;
        display: flex;
        flex-direction: column;
        gap: 32px;
      }
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      h1 {
        font-size: 22px;
        font-weight: 700;
      }
      .btn-ghost {
        background: transparent;
        color: var(--text-muted);
        border: 1px solid var(--border);
        padding: 8px 16px;
        font-size: 13px;
      }
      .btn-ghost:hover {
        color: var(--text);
        border-color: var(--text-muted);
      }
      section {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      h2 {
        font-size: 15px;
        font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .sub-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid var(--border);
        gap: 12px;
      }
      .sub-row:last-child {
        border-bottom: none;
      }
      .sub-name {
        font-weight: 600;
        flex: 1;
      }
      .sub-id {
        font-size: 12px;
        color: var(--text-muted);
      }
      .toggles {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .chip {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        border: 1px solid var(--border);
        background: var(--surface2);
        color: var(--text-muted);
        transition: background 0.15s, color 0.15s;
      }
      .chip.on {
        background: var(--primary);
        border-color: var(--primary);
        color: #fff;
      }
      .chip.danger.on {
        background: var(--danger);
        border-color: var(--danger);
      }
      .trigger-row {
        display: flex;
        gap: 12px;
      }
      .btn-trigger {
        background: var(--surface2);
        color: var(--text);
        border: 1px solid var(--border);
        padding: 10px 18px;
        font-size: 13px;
      }
      .btn-trigger:hover:not(:disabled) {
        border-color: var(--primary);
        color: var(--primary);
      }
      .config-row {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        color: var(--text-muted);
      }
      .config-row strong {
        color: var(--text);
      }
      .empty {
        color: var(--text-muted);
        font-size: 14px;
      }
    `,
  ],
  template: `
    <div class="layout">
      <header>
        <h1>Panel admina 🏅</h1>
        <button class="btn-ghost" (click)="logout()">Wyloguj</button>
      </header>

      <section>
        <h2>Konfiguracja bota</h2>
        @if (botConfig(); as cfg) {
          <div class="config-row">
            <span>Globalne obrazki odznak</span>
            <strong>{{ cfg.showBadgeImage ? 'Tak' : 'Nie' }}</strong>
          </div>
          <div class="config-row">
            <span>Tygodniowy digest co dzień</span>
            <strong>{{ cfg.weeklyEveryDay ? 'Tak' : 'Nie' }}</strong>
          </div>
          <div class="config-row">
            <span>Godzina daily check</span>
            <strong>{{ cfg.dailyHour }}:{{ cfg.dailyMinute.toString().padStart(2, '0') }}</strong>
          </div>
        } @else {
          <span class="empty">Ładowanie&hellip;</span>
        }
      </section>

      <section>
        <h2>Subskrybenci</h2>
        @if (subscribers().length === 0) {
          <span class="empty">Brak subskrybentów.</span>
        }
        @for (sub of subscribers(); track sub.chatId) {
          <div class="sub-row">
            <div>
              <div class="sub-name">{{ sub.name }}</div>
              <div class="sub-id">{{ sub.chatId }}</div>
            </div>
            <div class="toggles">
              <span
                class="chip"
                [class.on]="sub.showImages"
                (click)="toggleImages(sub)"
                title="Obrazki odznak"
              >🖼 Obrazki</span>
              <span
                class="chip danger"
                [class.on]="!sub.active"
                (click)="toggleActive(sub)"
                title="Wycisz powiadomienia"
              >{{ sub.active ? '🔔 Aktywny' : '🔕 Wyciszony' }}</span>
            </div>
          </div>
        }
      </section>

      <section>
        <h2>Ręczne wyzwolenia</h2>
        <div class="trigger-row">
          <button class="btn-trigger" [disabled]="triggering()" (click)="triggerWeekly()">
            📋 Wyślij weekly digest
          </button>
          <button class="btn-trigger" [disabled]="triggering()" (click)="triggerDaily()">
            📅 Wyślij daily check
          </button>
        </div>
      </section>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  readonly subscribers = signal<Subscriber[]>([]);
  readonly botConfig = signal<BotConfig | null>(null);
  readonly triggering = signal(false);

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  async ngOnInit() {
    const [subs, cfg] = await Promise.all([this.api.getSubscribers(), this.api.getConfig()]);
    this.subscribers.set(subs);
    this.botConfig.set(cfg);
  }

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
