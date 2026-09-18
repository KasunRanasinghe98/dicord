import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE_NAME = "dc_session";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface SessionPayload {
  userId: string;
  role: Role;
}

const PLACEHOLDER_SECRET = "replace-with-a-random-32-byte-secret";

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET environment variable is not set.");
  }
  // .env.example ships this literal string. It works as a signing key —
  // nothing stops a copy-pasted, never-edited .env from "working" in
  // production with every session forgeable by anyone who's read the repo.
  if (secret === PLACEHOLDER_SECRET && process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET is still set to the placeholder value from .env.example. Generate a real secret before running in production.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return { userId: payload.userId, role: payload.role as Role };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

// Server Components / Route Handlers only (relies on next/headers cookies()).
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
