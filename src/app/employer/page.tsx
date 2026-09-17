import Link from "next/link";
import { getSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { LogoutButton } from "@/app/logout-button";
import { JOB_CATEGORY_LABELS } from "@/lib/constants";
import { formatStatus } from "@/lib/format";
import { JobActions } from "./job-actions";

export const dynamic = "force-dynamic";

export default async function EmployerDashboardPage() {
  const session = await getSession();
  const profile = session
    ? await db.employerProfile.findUnique({ where: { userId: session.userId } })
    : null;

  const jobs = profile
    ? await db.job.findMany({
        where: { employerId: profile.id },
        include: { _count: { select: { assignments: { where: { status: "CONFIRMED" } } } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          {profile ? profile.businessName : "Welcome"}
        </h1>
        <LogoutButton />
      </div>

      {!profile ? (
        <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p>Set up your business profile before posting a job.</p>
          <Link
            href="/employer/onboarding"
            className="inline-block rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
          >
            Set up profile
          </Link>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <Link href="/employer/onboarding" className="text-xs text-neutral-500 underline">
            Edit business profile
          </Link>
          <Link
            href="/employer/jobs/new"
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
          >
            Post a job
          </Link>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Your jobs</h2>
        {profile && jobs.length === 0 && (
          <p className="text-sm text-neutral-400">
            You haven&apos;t posted any jobs yet.
          </p>
        )}
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-lg border border-neutral-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">{job.title}</h3>
                  <p className="text-xs text-neutral-500">{JOB_CATEGORY_LABELS[job.category]}</p>
                </div>
                <span className="whitespace-nowrap rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                  {formatStatus(job.status)}
                </span>
              </div>
              <p className="mt-2 text-xs text-neutral-600">
                {job._count.assignments} / {job.workersRequired} confirmed
              </p>
              <JobActions jobId={job.id} status={job.status} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
