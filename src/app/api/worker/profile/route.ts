import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/guard";
import { parseCsvList } from "@/lib/csv";
import { JobCategory } from "@prisma/client";

const bodySchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required."),
  university: z.string().trim().optional(),
  location: z.string().trim().optional(),
  preferredAreas: z.string().optional().default(""),
  preferredCategories: z.array(z.nativeEnum(JobCategory)).default([]),
  skills: z.string().optional().default(""),
  languages: z.string().optional().default(""),
  transportAvailable: z.boolean().default(false),
  // Days of week (0=Sunday..6=Saturday) the worker is generally available.
  availableDays: z.array(z.number().int().min(0).max(6)).default([]),
});

export async function GET() {
  const auth = await requireRole("WORKER");
  if ("error" in auth) return auth.error;

  const profile = await db.workerProfile.findUnique({
    where: { userId: auth.session.userId },
    include: { availability: true },
  });

  return NextResponse.json({ profile });
}

export async function POST(request: Request) {
  const auth = await requireRole("WORKER");
  if ("error" in auth) return auth.error;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const profile = await db.$transaction(async (tx) => {
    const saved = await tx.workerProfile.upsert({
      where: { userId: auth.session.userId },
      update: {
        fullName: data.fullName,
        university: data.university || null,
        location: data.location || null,
        preferredAreas: parseCsvList(data.preferredAreas),
        preferredCategories: data.preferredCategories,
        skills: parseCsvList(data.skills),
        languages: parseCsvList(data.languages),
        transportAvailable: data.transportAvailable,
      },
      create: {
        userId: auth.session.userId,
        fullName: data.fullName,
        university: data.university || null,
        location: data.location || null,
        preferredAreas: parseCsvList(data.preferredAreas),
        preferredCategories: data.preferredCategories,
        skills: parseCsvList(data.skills),
        languages: parseCsvList(data.languages),
        transportAvailable: data.transportAvailable,
      },
    });

    // Simplest correct way to keep this small table in sync with the
    // checkbox grid: replace the set of available days each save.
    await tx.workerAvailability.deleteMany({ where: { workerProfileId: saved.id } });
    if (data.availableDays.length > 0) {
      await tx.workerAvailability.createMany({
        data: data.availableDays.map((dayOfWeek) => ({
          workerProfileId: saved.id,
          dayOfWeek,
          isAvailable: true,
        })),
      });
    }

    return saved;
  });

  return NextResponse.json({ ok: true, profile });
}
