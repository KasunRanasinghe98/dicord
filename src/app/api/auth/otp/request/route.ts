import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { requestOtp } from "@/server/auth/otp";

const bodySchema = z.object({
  phone: z.string().min(9),
  purpose: z.enum(["LOGIN", "REGISTER"]),
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

  await requestOtp(phone, parsed.data.purpose);

  return NextResponse.json({ ok: true });
}
