import { Component, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/auth.service.js";

type Step = "idle" | "sent" | "loading" | "error";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [FormsModule],
  styles: [
    `
      .page {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      .card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 40px 36px;
        width: 100%;
        max-width: 400px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      h1 {
        font-size: 22px;
        font-weight: 700;
      }
      p {
        color: var(--text-muted);
        font-size: 14px;
      }
      .btn-primary {
        background: var(--primary);
        color: #fff;
        padding: 12px 20px;
        width: 100%;
      }
      .btn-primary:hover:not(:disabled) {
        background: var(--primary-hover);
      }
      .error {
        color: var(--danger);
        font-size: 13px;
      }
    `,
  ],
  template: `
    <div class="page">
      <div class="card">
        <h1>Garmin Badge Admin</h1>

        @if (step() === 'idle') {
          <p>Kliknij poniżej, żeby otrzymać kod logowania na Telegramie.</p>
          <button class="btn-primary" (click)="requestCode()">Wyślij kod</button>
        }

        @if (step() === 'sent' || step() === 'error') {
          <p>Kod został wysłany na Twój prywatny chat. Wpisz go poniżej.</p>
          <input
            type="text"
            placeholder="123456"
            [(ngModel)]="code"
            (keyup.enter)="verify()"
            maxlength="6"
            autocomplete="one-time-code"
          />
          <button class="btn-primary" [disabled]="!code()" (click)="verify()">Zaloguj</button>
          @if (step() === 'error') {
            <span class="error">Nieprawidłowy lub wygasły kod. Spróbuj ponownie.</span>
          }
        }

        @if (step() === 'loading') {
          <p>Weryfikacja&hellip;</p>
        }
      </div>
    </div>
  `,
})
export class LoginComponent {
  readonly step = signal<Step>("idle");
  code = "";

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  async requestCode() {
    this.step.set("loading");
    await this.auth.requestCode();
    this.step.set("sent");
  }

  async verify() {
    if (!this.code) return;
    this.step.set("loading");
    const ok = await this.auth.verifyCode(this.code);
    if (ok) {
      await this.router.navigate(["/dashboard"]);
    } else {
      this.step.set("error");
    }
  }
}
