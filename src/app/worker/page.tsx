import { getSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { LogoutButton } from "@/app/logout-button";

export default async function WorkerDashboardPage() {
  const session = await getSession();
  const profile = session
    ? await db.workerProfile.findUnique({ where: { userId: session.userId } })
    : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          {profile ? `Hi, ${profile.fullName.split(" ")[0]}` : "Welcome"}
        </h1>
        <LogoutButton />
      </div>

      {!profile && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Your profile isn&apos;t set up yet. Profile completion is coming in
          the next build phase.
        </div>
      )}

      <section className="rounded-lg border border-neutral-200 p-4">
        <h2 className="text-sm font-medium text-neutral-500">Matching jobs</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Job browsing lands in Phase 2.
        </p>
      </section>

      <section className="rounded-lg border border-neutral-200 p-4">
        <h2 className="text-sm font-medium text-neutral-500">Upcoming shifts</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Assignment tracking lands in Phase 5.
        </p>
      </section>
    </main>
  );
}
