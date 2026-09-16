import { db } from "@/server/db";
import type { JobCategory } from "@prisma/client";

export interface WorkerJobFilters {
  category?: JobCategory;
  location?: string;
  date?: string;
}

// Shared between the /api/jobs route (client-side filtering/refetching) and
// the worker dashboard's initial server-rendered list, so the two never
// drift apart.
export async function getOpenJobsForWorker(userId: string, filters: WorkerJobFilters = {}) {
  const [workerProfile, jobs] = await Promise.all([
    db.workerProfile.findUnique({ where: { userId } }),
    db.job.findMany({
      where: {
        status: { in: ["OPEN", "PARTIALLY_FILLED"] },
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.location
          ? { location: { contains: filters.location, mode: "insensitive" as const } }
          : {}),
        ...(filters.date ? { date: new Date(filters.date) } : {}),
      },
      include: {
        employer: { select: { businessName: true } },
        _count: { select: { assignments: { where: { status: "CONFIRMED" } } } },
      },
      orderBy: { date: "asc" },
    }),
  ]);

  const myApplications = workerProfile
    ? await db.application.findMany({
        where: { workerProfileId: workerProfile.id, jobId: { in: jobs.map((j) => j.id) } },
        select: { jobId: true, status: true },
      })
    : [];
  const applicationByJobId = new Map(myApplications.map((a) => [a.jobId, a.status]));

  return jobs.map((job) => ({
    id: job.id,
    title: job.title,
    category: job.category,
    description: job.description,
    date: job.date,
    startTime: job.startTime,
    endTime: job.endTime,
    location: job.location,
    payPerWorker: job.payPerWorker.toString(),
    workersRequired: job.workersRequired,
    confirmedCount: job._count.assignments,
    mealsProvided: job.mealsProvided,
    transportProvided: job.transportProvided,
    applicationDeadline: job.applicationDeadline,
    employerName: job.employer.businessName,
    isPreferredCategory: workerProfile?.preferredCategories.includes(job.category) ?? false,
    applicationStatus: applicationByJobId.get(job.id) ?? null,
  }));
}

export type WorkerJobListing = Awaited<ReturnType<typeof getOpenJobsForWorker>>[number];
