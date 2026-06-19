import crypto from "node:crypto";

interface PendingCode {
  code: string;
  expiresAt: number;
}

let pending: PendingCode | null = null;
const sessions = new Set<string>();

export function generateCode(): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  pending = { code, expiresAt: Date.now() + 5 * 60 * 1000 };
  return code;
}

export function consumeCode(code: string): string | null {
  if (!pending) return null;
  if (Date.now() > pending.expiresAt) {
    pending = null;
    return null;
  }
  if (pending.code !== code.trim()) return null;
  pending = null;
  const token = crypto.randomUUID();
  sessions.add(token);
  return token;
}

export function isValidSession(token: string): boolean {
  return sessions.has(token);
}

export function invalidateSession(token: string): void {
  sessions.delete(token);
}
