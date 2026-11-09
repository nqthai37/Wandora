import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Actor } from "./types";

type Session = Actor & { exp: number };

function signature(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

function checkSecret(secret: string): void {
  if (Buffer.byteLength(secret) < 32)
    throw new Error("Session configuration unavailable");
}

// Server/test provisioning only. Not a public login endpoint.
export function signSession(session: Session, secret: string): string {
  checkSecret(secret);
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${signature(payload, secret).toString("base64url")}`;
}

export function authenticateSession(
  request: Request,
  secret: string,
  now: Date,
): Actor | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  checkSecret(secret);
  const match = /^Bearer ([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(header);
  if (!match || header.length > 4096) return null;
  const [, payload, signed] = match;
  const actual = Buffer.from(signed, "base64url");
  const expected = signature(payload, secret);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return null;
  try {
    const session: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (!session || typeof session !== "object") return null;
    const value = session as Partial<Session>;
    if (
      typeof value.userId !== "string" ||
      !/^[A-Za-z0-9_-]{1,64}$/.test(value.userId) ||
      (value.role !== "member" && value.role !== "admin") ||
      !Number.isSafeInteger(value.exp) ||
      value.exp! <= Math.floor(now.getTime() / 1000)
    )
      return null;
    return { userId: value.userId, role: value.role };
  } catch {
    return null;
  }
}
