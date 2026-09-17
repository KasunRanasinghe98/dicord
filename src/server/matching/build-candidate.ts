import type { PrismaClient, Prisma, WorkerProfile, Job } from "@prisma/client";
import type { CandidateWorker } from "./engine";

type DbClient = PrismaClient | Prisma.TransactionClient;

const RECENT_WORKLOAD_WINDOW_DAYS = 14;

// Blueprint §28: "A worker cannot be assigned to overlapping jobs." Standard
// interval-overlap check against every other CONFIRMED assignment this
// worker holds.
export async function hasSchedulingConflict(
  db: DbClient,
  workerProfileId: string,
  job: Pick<Job, "id" | "startTime" | "endTime">,
): Promise<boolean> {
  const conflict = await db.assignment.findFirst({
    where: {
      workerProfileId,
      status: "CONFIRMED",
      jobId: { not: job.id },
      job: { startTime: { lt: job.endTime }, endTime: { gt: job.startTime } },
    },
  });
  return conflict !== null;
}

// Assembles the matching engine's input shape from real data, for one
// worker against one job — used both to score replacement suggestions and
// to hard-block a conflicting confirmation.
export async function buildCandidateWorker(
  db: DbClient,
  workerProfile: WorkerProfile,
  job: Job,
): Promise<CandidateWorker> {
  const recentSince = new Date(Date.now() - RECENT_WORKLOAD_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [hasConflict, completedJobsInCategory, presentOrLate, totalMarked, recentAssignmentCount] =
    await Promise.all([
      hasSchedulingConflict(db, workerProfile.id, job),
      db.assignment.count({
        where: { workerProfileId: workerProfile.id, status: "COMPLETED", job: { category: job.category } },
      }),
      db.attendance.count({
        where: { assignment: { workerProfileId: workerProfile.id }, status: { in: ["PRESENT", "LATE"] } },
      }),
      db.attendance.count({
        where: {
          assignment: { workerProfileId: workerProfile.id },
          status: { in: ["PRESENT", "LATE", "ABSENT"] },
        },
      }),
      db.assignment.count({
        where: {
          workerProfileId: workerProfile.id,
          status: "CONFIRMED",
          createdAt: { gte: recentSince },
        },
      }),
    ]);

  return {
    workerProfileId: workerProfile.id,
    isActive: true,
    preferredCategories: workerProfile.preferredCategories,
    preferredAreas: workerProfile.preferredAreas,
    hasConflictingAssignment: hasConflict,
    requiredSkills: job.requiredSkills,
    workerSkills: workerProfile.skills,
    completedJobsInCategory,
    // No attendance history yet shouldn't read as "unreliable" — default to
    // a neutral-good rate rather than 0 for brand new workers.
    attendanceRate: totalMarked === 0 ? 1 : presentOrLate / totalMarked,
    recentAssignmentCount,
  };
}
