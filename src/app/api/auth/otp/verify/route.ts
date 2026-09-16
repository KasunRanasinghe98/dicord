import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { verifyOtp } from "@/server/auth/otp";
import { db } from "@/server/db";
import { signSessionToken, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/server/auth/session";
import { logAudit } from "@/server/audit/log";

const bodySchema = z.object({
  phone: z.string().min(9),
  purpose: z.enum(["LOGIN", "REGISTER"]),
  code: z.string().length(6),
  // Only self-registerable roles. COORDINATOR/ADMIN accounts are provisioned
  // manually, never through this endpoint.
  role: z.enum(["WORKER", "EMPLOYER"]).optional(),
});

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

  const { purpose, code, role } = parsed.data;

  const result = await verifyOtp(phone, purpose, code);
  if (!result.ok) {
    const messages: Record<typeof result.reason, string> = {
      not_found: "No verification code was requested for this number.",
      expired: "This code has expired. Request a new one.",
      too_many_attempts: "Too many incorrect attempts. Request a new code.",
      incorrect: "Incorrect code.",
    };
    return NextResponse.json({ error: messages[result.reason] }, { status: 400 });
  }

  let user = await db.user.findUnique({ where: { phone } });

  if (purpose === "REGISTER") {
    if (user) {
      return NextResponse.json(
        { error: "An account already exists for this number. Please log in instead." },
        { status: 409 },
      );
    }
    if (!role) {
      return NextResponse.json(
        { error: "A role (WORKER or EMPLOYER) is required to register." },
        { status: 400 },
      );
    }
    user = await db.user.create({
      data: { phone, role, accountStatus: "ACTIVE" },
    });
    await logAudit({ actorUserId: user.id, action: "USER_REGISTERED", targetType: "User", targetId: user.id });
  } else {
    if (!user) {
      return NextResponse.json(
        { error: "No account found for this number. Please register first." },
        { status: 404 },
      );
    }
    await db.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  }

  const token = await signSessionToken({ userId: user.id, role: user.role });
  const response = NextResponse.json({
    ok: true,
    user: { id: user.id, role: user.role },
    isNewUser: purpose === "REGISTER",
  });
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);
  return response;
}
