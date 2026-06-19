import { Component, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/auth.service.js";

type Step = "idle" | "sent" | "loading" | "error" | "send-error";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./login.component.html",
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
    try {
      await this.auth.requestCode();
      this.step.set("sent");
    } catch {
      this.step.set("send-error");
    }
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
