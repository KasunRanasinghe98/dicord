import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/guard";
import { EmployerType } from "@prisma/client";

const bodySchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required."),
  contactPerson: z.string().trim().min(1, "Contact person is required."),
  location: z.string().trim().optional(),
  employerType: z.nativeEnum(EmployerType),
});

export async function GET() {
  const auth = await requireRole("EMPLOYER");
  if ("error" in auth) return auth.error;

  const profile = await db.employerProfile.findUnique({
    where: { userId: auth.session.userId },
  });

  return NextResponse.json({ profile });
}

export async function POST(request: Request) {
  const auth = await requireRole("EMPLOYER");
  if ("error" in auth) return auth.error;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const profile = await db.employerProfile.upsert({
    where: { userId: auth.session.userId },
    update: {
      businessName: data.businessName,
      contactPerson: data.contactPerson,
      location: data.location || null,
      employerType: data.employerType,
    },
    create: {
      userId: auth.session.userId,
      businessName: data.businessName,
      contactPerson: data.contactPerson,
      location: data.location || null,
      employerType: data.employerType,
    },
  });

  return NextResponse.json({ ok: true, profile });
}
