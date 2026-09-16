import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth/guard";
import { getOpenJobsForWorker } from "@/server/jobs/queries";
import type { JobCategory } from "@prisma/client";

// Worker-facing job browsing (blueprint §22/§23): plain filtered listing,
// no search engine, no auto-matching. Auto-matching/notification is a
// Phase 5 concern (§13) — this is the pull side, not the push side.
export async function GET(request: Request) {
  const auth = await requireRole("WORKER");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const jobs = await getOpenJobsForWorker(auth.session.userId, {
    category: (searchParams.get("category") as JobCategory) || undefined,
    location: searchParams.get("location") || undefined,
    date: searchParams.get("date") || undefined,
  });

  return NextResponse.json({ jobs });
}
