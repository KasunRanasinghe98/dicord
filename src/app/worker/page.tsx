import Link from "next/link";
import { getSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { getOpenJobsForWorker } from "@/server/jobs/queries";
import { LogoutButton } from "@/app/logout-button";
import { JobsBrowser } from "./jobs-browser";

export const dynamic = "force-dynamic";

export default async function WorkerDashboardPage() {
  const session = await getSession();
  const profile = session
    ? await db.workerProfile.findUnique({ where: { userId: session.userId } })
    : null;

  const [jobs, myApplications] = await Promise.all([
    session ? getOpenJobsForWorker(session.userId) : [],
    profile
      ? db.application.findMany({
          where: { workerProfileId: profile.id },
          include: { job: { select: { title: true, date: true } } },
          orderBy: { appliedAt: "desc" },
          take: 10,
        })
      : [],
  ]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          {profile ? `Hi, ${profile.fullName.split(" ")[0]}` : "Welcome"}
        </h1>
        <LogoutButton />
      </div>

      {!profile ? (
        <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p>Complete your profile so employers can match you to jobs.</p>
          <Link
            href="/worker/onboarding"
            className="inline-block rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
          >
            Complete profile
          </Link>
        </div>
      ) : (
        <div className="flex justify-end">
          <Link href="/worker/onboarding" className="text-xs text-neutral-500 underline">
            Edit profile
          </Link>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Open jobs</h2>
        <JobsBrowser initialJobs={jobs} />
      </section>

      <section className="rounded-lg border border-neutral-200 p-4">
        <h2 className="text-sm font-medium text-neutral-500">My applications</h2>
        {myApplications.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-400">You haven&apos;t applied to any jobs yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {myApplications.map((app) => (
              <li key={app.id} className="flex items-center justify-between text-sm">
                <span>{app.job.title}</span>
                <span className="text-xs text-neutral-500">{app.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
