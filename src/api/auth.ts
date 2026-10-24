import crypto from "node:crypto";

const CODE_TTL_MS = 5 * 60 * 1000;
const CODE_MAX_ATTEMPTS = 5;
const CODE_REQUEST_COOLDOWN_MS = 30 * 1000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

interface PendingCode {
  code: string;
  expiresAt: number;
  attemptsLeft: number;
}

let pending: PendingCode | null = null;
let lastRequestAt = 0;
const sessions = new Map<string, number>();

/** Returns a new code, or null when a code was requested less than the cooldown ago. */
export const generateCode = (): string | null => {
  const now = Date.now();
  if (now - lastRequestAt < CODE_REQUEST_COOLDOWN_MS) {
    return null;
  }
  lastRequestAt = now;
  const code = crypto.randomInt(100000, 1000000).toString();
  pending = { code, expiresAt: now + CODE_TTL_MS, attemptsLeft: CODE_MAX_ATTEMPTS };
  return code;
};

export const consumeCode = (code: string): string | null => {
  if (!pending) {
    return null;
  }
  if (Date.now() > pending.expiresAt) {
    pending = null;
    return null;
  }
  if (pending.code !== code.trim()) {
    pending.attemptsLeft -= 1;
    if (pending.attemptsLeft <= 0) {
      pending = null;
    }
    return null;
  }
  pending = null;
  const token = crypto.randomUUID();
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
};

export const isValidSession = (token: string): boolean => {
  const expiresAt = sessions.get(token);
  if (expiresAt === undefined) {
    return false;
  }
  if (Date.now() > expiresAt) {
    sessions.delete(token);
    return false;
  }
  return true;
};

export const invalidateSession = (token: string): void => {
  sessions.delete(token);
};
