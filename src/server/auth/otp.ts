import { randomInt, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { db } from "@/server/db";
import { smsProvider } from "@/server/auth/sms";
import type { OtpPurpose } from "@prisma/client";

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 5;
const MAX_ATTEMPTS = 5;

function hashCode(code: string, salt: string): string {
  return scryptSync(code, salt, 64).toString("hex");
}

function generateCode(): string {
  return randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

// codeHash is stored as "salt:hash" so verification doesn't need a separate
// salt column and each code gets a fresh salt.
function packHash(code: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${hashCode(code, salt)}`;
}

function matchesHash(code: string, packed: string): boolean {
  const [salt, hash] = packed.split(":");
  if (!salt || !hash) return false;
  const candidate = hashCode(code, salt);
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function requestOtp(phone: string, purpose: OtpPurpose): Promise<void> {
  const code = generateCode();

  await db.otpCode.create({
    data: {
      phone,
      purpose,
      codeHash: packHash(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    },
  });

  await smsProvider.send(
    phone,
    `Your Digital Coordinator verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
  );
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "too_many_attempts" | "incorrect" };

export async function verifyOtp(
  phone: string,
  purpose: OtpPurpose,
  code: string,
): Promise<VerifyOtpResult> {
  const otp = await db.otpCode.findFirst({
    where: { phone, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return { ok: false, reason: "not_found" };
  if (otp.expiresAt < new Date()) return { ok: false, reason: "expired" };
  if (otp.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };

  if (!matchesHash(code, otp.codeHash)) {
    await db.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "incorrect" };
  }

  await db.otpCode.update({
    where: { id: otp.id },
    data: { consumedAt: new Date() },
  });

  return { ok: true };
}
