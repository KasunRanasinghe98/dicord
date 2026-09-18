import { NextResponse } from "next/server";
import { z } from "zod";
import { JobCategory } from "@prisma/client";
import { requireRole } from "@/server/auth/guard";
import { getOpenJobsForWorker } from "@/server/jobs/queries";

const querySchema = z.object({
  category: z.nativeEnum(JobCategory).optional(),
  location: z.string().trim().min(1).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date.")
    .optional(),
});

// Worker-facing job browsing (blueprint §22/§23): plain filtered listing,
// no search engine, no auto-matching. Auto-matching/notification is a
// Phase 5 concern (§13) — this is the pull side, not the push side.
export async function GET(request: Request) {
  const auth = await requireRole("WORKER");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    category: searchParams.get("category") || undefined,
    location: searchParams.get("location") || undefined,
    date: searchParams.get("date") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid query." },
      { status: 400 },
    );
  }

  const jobs = await getOpenJobsForWorker(auth.session.userId, parsed.data);

  return NextResponse.json({ jobs });
}
