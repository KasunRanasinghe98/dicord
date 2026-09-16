import { db } from "@/server/db";
import { LogoutButton } from "@/app/logout-button";

// This page always reflects live counts and is only ever reached through
// the coordinator/admin-gated proxy, so it should never be statically
// prerendered at build time.
export const dynamic = "force-dynamic";

export default async function CoordinatorDashboardPage() {
  const [workerCount, employerCount, jobCount] = await Promise.all([
    db.workerProfile.count(),
    db.employerProfile.count(),
    db.job.count(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Coordinator dashboard</h1>
        <LogoutButton />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Metric label="Workers" value={workerCount} />
        <Metric label="Employers" value={employerCount} />
        <Metric label="Jobs" value={jobCount} />
      </div>

      <section className="rounded-lg border border-neutral-200 p-4">
        <h2 className="text-sm font-medium text-neutral-500">Today&apos;s jobs</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Job approval and headcount tracking land in Phase 4.
        </p>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4 text-center">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}
