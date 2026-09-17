import type { PrismaClient, Prisma, JobStatus } from "@prisma/client";
import { deriveHeadcountStatus, canTransitionJob } from "./state-machine";

type DbClient = PrismaClient | Prisma.TransactionClient;

const HEADCOUNT_DRIVEN: JobStatus[] = ["OPEN", "PARTIALLY_FILLED", "FULL"];

// Called after any Assignment is created or cancelled. Only touches jobs
// currently in a headcount-driven status — once a job has moved into
// CONFIRMATION+ it can still unravel (state machine allows it), but that's
// an explicit coordinator call to make, not an automatic side effect of
// this specific status range. Safe to call unconditionally after any
// assignment change; it's a no-op outside OPEN/PARTIALLY_FILLED/FULL.
export async function syncJobHeadcountStatus(db: DbClient, jobId: string): Promise<void> {
  const job = await db.job.findUniqueOrThrow({ where: { id: jobId } });
  if (!HEADCOUNT_DRIVEN.includes(job.status)) return;

  const confirmedCount = await db.assignment.count({
    where: { jobId, status: "CONFIRMED" },
  });
  const next = deriveHeadcountStatus(confirmedCount, job.workersRequired);

  if (next !== job.status && canTransitionJob(job.status, next)) {
    await db.job.update({ where: { id: jobId }, data: { status: next } });
  }
}
