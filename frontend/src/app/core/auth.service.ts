import { Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

const TOKEN_KEY = "admin_session_token";

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly _token = signal<string | null>(sessionStorage.getItem(TOKEN_KEY));
  readonly isLoggedIn = () => this._token() !== null;
  readonly token = () => this._token();

  constructor(private readonly http: HttpClient) {}

  async requestCode(): Promise<void> {
    await firstValueFrom(this.http.post("/api/auth/request", {}));
  }

  async verifyCode(code: string): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ token: string }>("/api/auth/verify", { code }),
      );
      this._token.set(res.token);
      sessionStorage.setItem(TOKEN_KEY, res.token);
      return true;
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post("/api/auth/logout", {}, { headers: this.authHeaders() }),
      );
    } finally {
      this._token.set(null);
      sessionStorage.removeItem(TOKEN_KEY);
    }
  }

  clearSession(): void {
    this._token.set(null);
    sessionStorage.removeItem(TOKEN_KEY);
  }

  authHeaders(): Record<string, string> {
    const t = this._token();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }
}
