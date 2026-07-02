import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { User } from "@/types/db";

const COOKIE_NAME = "neo_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 Tage

export interface SessionPayload {
  userId: number;
  email: string;
  role: User["role"];
  expiresAt: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET ist nicht gesetzt");
  }
  return secret;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

// Signierter (nicht verschlüsselter) Cookie-Wert: Payload enthält keine
// sensiblen Daten (siehe SessionPayload), die Signatur verhindert nur
// Manipulation durch den Client.
function encode(payload: SessionPayload): string {
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${json}.${sign(json)}`;
}

function decode(token: string): SessionPayload | null {
  const [json, signature] = token.split(".");
  if (!json || !signature) return null;

  const expected = Buffer.from(sign(json));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(json, "base64url").toString()) as SessionPayload;
    if (typeof payload.expiresAt !== "number" || payload.expiresAt < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(user: {
  id: number;
  email: string;
  role: User["role"];
}): Promise<void> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const token = encode({
    userId: user.id,
    email: user.email,
    role: user.role,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(expiresAt),
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return decode(token);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
