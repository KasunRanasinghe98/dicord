import Link from "next/link";
import { db } from "@/server/db";
import { JOB_CATEGORY_LABELS } from "@/lib/constants";
import { formatStatus } from "@/lib/format";
import type { JobStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_FILTERS: Array<JobStatus | "ALL"> = [
  "ALL",
  "PENDING_APPROVAL",
  "OPEN",
  "PARTIALLY_FILLED",
  "FULL",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

export default async function CoordinatorJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = STATUS_FILTERS.includes(status as JobStatus | "ALL")
    ? (status as JobStatus | "ALL" | undefined)
    : "ALL";

  const jobs = await db.job.findMany({
    where: filter && filter !== "ALL" ? { status: filter } : {},
    include: {
      employer: { select: { businessName: true } },
      _count: { select: { assignments: { where: { status: "CONFIRMED" } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">All jobs</h1>
        <Link href="/coordinator" className="text-xs text-neutral-500 underline">
          Back to dashboard
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <Link
            key={s}
            href={s === "ALL" ? "/coordinator/jobs" : `/coordinator/jobs?status=${s}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              filter === s ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"
            }`}
          >
            {s === "ALL" ? "ALL" : formatStatus(s)}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {jobs.length === 0 && <p className="text-sm text-neutral-400">No jobs match this filter.</p>}
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/coordinator/jobs/${job.id}`}
            className="block rounded-lg border border-neutral-200 p-4 hover:border-neutral-400"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">{job.title}</h3>
                <p className="text-xs text-neutral-500">
                  {job.employer.businessName} · {JOB_CATEGORY_LABELS[job.category]}
                </p>
              </div>
              <span className="whitespace-nowrap rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                {formatStatus(job.status)}
              </span>
            </div>
            <p className="mt-2 text-xs text-neutral-600">
              {job._count.assignments} / {job.workersRequired} confirmed
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
