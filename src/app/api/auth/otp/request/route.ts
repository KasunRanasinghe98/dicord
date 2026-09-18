import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { requestOtp } from "@/server/auth/otp";
import { checkRateLimit } from "@/server/auth/rate-limit";

const bodySchema = z.object({
  phone: z.string().min(9),
  purpose: z.enum(["LOGIN", "REGISTER"]),
});

// Per-phone cap stops someone burning through OTP requests to keep
// resetting the 5-attempt lockout on otp.ts's verify side; per-IP cap
// stops one source spamming SMS costs across many different numbers.
const PHONE_LIMIT = 5;
const IP_LIMIT = 20;
const WINDOW_MS = 15 * 60 * 1000;

function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  let phone: string;
  try {
    phone = normalizePhone(parsed.data.phone);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const phoneLimit = checkRateLimit(`otp-phone:${phone}`, PHONE_LIMIT, WINDOW_MS);
  if (!phoneLimit.allowed) {
    return NextResponse.json(
      { error: "Too many codes requested for this number. Try again later." },
      { status: 429 },
    );
  }

  const ipLimit = checkRateLimit(`otp-ip:${getClientIp(request)}`, IP_LIMIT, WINDOW_MS);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 },
    );
  }

  await requestOtp(phone, parsed.data.purpose);

  return NextResponse.json({ ok: true });
}
