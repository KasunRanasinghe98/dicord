import { NextResponse } from "next/server";
import { db } from "@/server/db";
import type { Job } from "@prisma/client";

// Loads the caller's own EmployerProfile and confirms the given job
// actually belongs to them. Every employer job mutation route needs this —
// requireRole("EMPLOYER") only proves "some employer", not "this employer".
export async function requireOwnJob(
  userId: string,
  jobId: string,
): Promise<{ job: Job; employerProfileId: string } | { error: NextResponse }> {
  const employerProfile = await db.employerProfile.findUnique({ where: { userId } });
  if (!employerProfile) {
    return {
      error: NextResponse.json(
        { error: "Complete your business profile first." },
        { status: 400 },
      ),
    };
  }

  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return { error: NextResponse.json({ error: "Job not found." }, { status: 404 }) };
  }
  if (job.employerId !== employerProfile.id) {
    return { error: NextResponse.json({ error: "Not authorized." }, { status: 403 }) };
  }

  return { job, employerProfileId: employerProfile.id };
}
