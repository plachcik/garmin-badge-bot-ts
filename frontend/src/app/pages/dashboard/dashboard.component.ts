import { Component, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/auth.service.js";
import { ApiService, Subscriber, BotConfig } from "../../core/api.service.js";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [FormsModule],
  styles: [
    `
      .layout {
        max-width: 820px;
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
      h1 { font-size: 22px; font-weight: 700; }
      h2 {
        font-size: 12px;
        font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: 4px;
      }
      .btn-ghost {
        background: transparent;
        color: var(--text-muted);
        border: 1px solid var(--border);
        padding: 8px 16px;
        font-size: 13px;
      }
      .btn-ghost:hover { color: var(--text); border-color: var(--text-muted); }
      section {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      /* ── Subscribers ── */
      .sub-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 0;
        border-bottom: 1px solid var(--border);
      }
      .sub-row:last-child { border-bottom: none; }
      .sub-info { flex: 1; min-width: 0; }
      .sub-name-display {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
        cursor: pointer;
      }
      .sub-name-display .edit-icon {
        font-size: 12px;
        color: var(--text-muted);
        opacity: 0;
        transition: opacity 0.15s;
      }
      .sub-row:hover .edit-icon { opacity: 1; }
      .sub-name-input {
        font-size: 15px;
        font-weight: 600;
        width: 100%;
        max-width: 260px;
      }
      .sub-id { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
      .toggles { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
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
        white-space: nowrap;
      }
      .chip.on { background: var(--primary); border-color: var(--primary); color: #fff; }
      .chip.muted.on { background: var(--danger); border-color: var(--danger); color: #fff; }
      .empty { color: var(--text-muted); font-size: 14px; }

      /* ── Schedule ── */
      .schedule-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      @media (max-width: 500px) { .schedule-grid { grid-template-columns: 1fr; } }
      .field { display: flex; flex-direction: column; gap: 6px; }
      label { font-size: 13px; color: var(--text-muted); }
      .time-row { display: flex; gap: 8px; align-items: center; }
      .time-row input { max-width: 80px; }
      .time-sep { color: var(--text-muted); font-weight: 700; }
      .toggle-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 0;
      }
      .toggle-switch {
        position: relative;
        width: 44px;
        height: 24px;
        flex-shrink: 0;
      }
      .toggle-switch input { opacity: 0; width: 0; height: 0; }
      .slider {
        position: absolute;
        inset: 0;
        background: var(--surface2);
        border: 1px solid var(--border);
        border-radius: 12px;
        cursor: pointer;
        transition: background 0.2s;
      }
      .slider::before {
        content: "";
        position: absolute;
        width: 18px; height: 18px;
        left: 2px; top: 2px;
        background: var(--text-muted);
        border-radius: 50%;
        transition: transform 0.2s, background 0.2s;
      }
      input:checked + .slider { background: var(--primary); border-color: var(--primary); }
      input:checked + .slider::before { transform: translateX(20px); background: #fff; }
      .toggle-label { font-size: 14px; }
      .save-row { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
      .btn-save {
        background: var(--primary);
        color: #fff;
        padding: 10px 22px;
      }
      .btn-save:hover:not(:disabled) { background: var(--primary-hover); }
      .save-ok { color: var(--success); font-size: 13px; }

      /* ── Triggers ── */
      .trigger-row { display: flex; gap: 12px; flex-wrap: wrap; }
      .btn-trigger {
        background: var(--surface2);
        color: var(--text);
        border: 1px solid var(--border);
        padding: 10px 18px;
        font-size: 13px;
      }
      .btn-trigger:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
    `,
  ],
  template: `
    <div class="layout">
      <header>
        <h1>Panel admina 🏅</h1>
        <button class="btn-ghost" (click)="logout()">Wyloguj</button>
      </header>

      <!-- ── Subscribers ── -->
      <section>
        <h2>Subskrybenci</h2>
        @if (subscribers().length === 0) {
          <span class="empty">Brak subskrybentów.</span>
        }
        @for (sub of subscribers(); track sub.chatId) {
          <div class="sub-row">
            <div class="sub-info">
              @if (editingName() === sub.chatId) {
                <input
                  class="sub-name-input"
                  type="text"
                  [(ngModel)]="editNameValue"
                  (keyup.enter)="saveName(sub)"
                  (keyup.escape)="cancelEdit()"
                  (blur)="saveName(sub)"
                  #nameInput
                />
              } @else {
                <div class="sub-name-display" (click)="startEdit(sub)">
                  {{ sub.name }}
                  <span class="edit-icon">✏️</span>
                </div>
              }
              <div class="sub-id">{{ sub.chatId }}</div>
            </div>
            <div class="toggles">
              <span
                class="chip"
                [class.on]="sub.showImages"
                (click)="toggleImages(sub)"
              >🖼 Obrazki</span>
              <span
                class="chip muted"
                [class.on]="!sub.active"
                (click)="toggleActive(sub)"
              >{{ sub.active ? '🔔 Aktywny' : '🔕 Wyciszony' }}</span>
            </div>
          </div>
        }
      </section>

      <!-- ── Schedule ── -->
      <section>
        <h2>Harmonogram</h2>
        @if (scheduleForm(); as f) {
          <div class="schedule-grid">
            <div class="field">
              <label>Godzina wysyłki (UTC)</label>
              <div class="time-row">
                <input
                  type="number"
                  min="0" max="23"
                  [ngModel]="f.dailyHour"
                  (ngModelChange)="scheduleForm.set({...f, dailyHour: $event})"
                />
                <span class="time-sep">:</span>
                <input
                  type="number"
                  min="0" max="59"
                  [ngModel]="f.dailyMinute"
                  (ngModelChange)="scheduleForm.set({...f, dailyMinute: $event})"
                />
              </div>
            </div>
          </div>

          <div class="toggle-row">
            <label class="toggle-switch">
              <input
                type="checkbox"
                [ngModel]="f.weeklyEveryDay"
                (ngModelChange)="scheduleForm.set({...f, weeklyEveryDay: $event})"
              />
              <span class="slider"></span>
            </label>
            <span class="toggle-label">
              Weekly digest codziennie
              <span style="color:var(--text-muted);font-size:13px">
                (wyłączone = tylko poniedziałki)
              </span>
            </span>
          </div>

          <div class="save-row">
            <button class="btn-save" [disabled]="savingSchedule()" (click)="saveSchedule()">
              {{ savingSchedule() ? 'Zapisywanie…' : 'Zapisz harmonogram' }}
            </button>
            @if (scheduleSaved()) {
              <span class="save-ok">✓ Zapisano</span>
            }
          </div>
        } @else {
          <span class="empty">Ładowanie&hellip;</span>
        }
      </section>

      <!-- ── Triggers ── -->
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
