import Link from "next/link";
import { db } from "@/server/db";
import { LogoutButton } from "@/app/logout-button";
import { JOB_CATEGORY_LABELS } from "@/lib/constants";
import { formatStatus } from "@/lib/format";
import { utcToSriLankaDateStr, calendarDateToUtcMidnight } from "@/lib/sri-lanka-time";
import { JobApprovalActions } from "./job-approval-actions";

export const dynamic = "force-dynamic";

export default async function CoordinatorDashboardPage() {
  const todayUtcMidnight = calendarDateToUtcMidnight(utcToSriLankaDateStr(new Date()));

  const [
    workerCount,
    employerCount,
    jobCount,
    unverifiedWorkerCount,
    unverifiedEmployerCount,
    pendingApplicationCount,
    activeJobCount,
    pendingPaymentCount,
    pendingApprovalJobs,
    todaysJobs,
  ] = await Promise.all([
    db.workerProfile.count(),
    db.employerProfile.count(),
    db.job.count(),
    db.workerProfile.count({ where: { verificationStatus: "UNVERIFIED" } }),
    db.employerProfile.count({ where: { verificationStatus: "UNVERIFIED" } }),
    db.application.count({ where: { status: "APPLIED" } }),
    db.job.count({
      where: { status: { in: ["OPEN", "PARTIALLY_FILLED", "FULL", "CONFIRMATION", "IN_PROGRESS"] } },
    }),
    db.payment.count({
      where: { OR: [{ employerPaymentStatus: "PENDING" }, { workerPaymentStatus: "PENDING" }] },
    }),
    db.job.findMany({
      where: { status: "PENDING_APPROVAL" },
      include: { employer: { select: { businessName: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.job.findMany({
      where: { date: todayUtcMidnight },
      include: {
        employer: { select: { businessName: true } },
        _count: { select: { assignments: { where: { status: "CONFIRMED" } } } },
      },
      orderBy: { startTime: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Coordinator dashboard</h1>
        <LogoutButton />
      </div>

      <div className="flex gap-2">
        <Link href="/coordinator/payments" className="text-xs text-neutral-500 underline">
          Payments
        </Link>
        <Link href="/coordinator/reports" className="text-xs text-neutral-500 underline">
          Reports
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Active jobs" value={activeJobCount} href="/coordinator/jobs" />
        <Metric label="Pending approval" value={pendingApprovalJobs.length} highlight />
        <Metric label="Pending applications" value={pendingApplicationCount} />
        <Metric label="Total jobs" value={jobCount} href="/coordinator/jobs" />
        <Metric
          label="Workers"
          value={workerCount}
          href="/coordinator/workers"
          sublabel={unverifiedWorkerCount > 0 ? `${unverifiedWorkerCount} unverified` : undefined}
        />
        <Metric
          label="Employers"
          value={employerCount}
          href="/coordinator/employers"
          sublabel={unverifiedEmployerCount > 0 ? `${unverifiedEmployerCount} unverified` : undefined}
        />
        <Metric
          label="Payments pending"
          value={pendingPaymentCount}
          href="/coordinator/payments"
          highlight
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Pending job approvals</h2>
        {pendingApprovalJobs.length === 0 ? (
          <p className="text-sm text-neutral-400">Nothing waiting on you right now.</p>
        ) : (
          <div className="space-y-3">
            {pendingApprovalJobs.map((job) => (
              <div key={job.id} className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={`/coordinator/jobs/${job.id}`} className="text-sm font-semibold underline">
                      {job.title}
                    </Link>
                    <p className="text-xs text-neutral-600">
                      {job.employer.businessName} · {JOB_CATEGORY_LABELS[job.category]} ·{" "}
                      {job.workersRequired} needed · Rs. {job.payPerWorker.toString()}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <JobApprovalActions jobId={job.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Today&apos;s jobs</h2>
        {todaysJobs.length === 0 ? (
          <p className="text-sm text-neutral-400">No jobs scheduled today.</p>
        ) : (
          <div className="space-y-3">
            {todaysJobs.map((job) => (
              <Link
                key={job.id}
                href={`/coordinator/jobs/${job.id}`}
                className="block rounded-lg border border-neutral-200 p-4 hover:border-neutral-400"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">{job.title}</h3>
                    <p className="text-xs text-neutral-500">{job.employer.businessName}</p>
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
        )}
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  href,
  sublabel,
  highlight,
}: {
  label: string;
  value: number;
  href?: string;
  sublabel?: string;
  highlight?: boolean;
}) {
  const content = (
    <div
      className={`rounded-lg border p-4 text-center ${
        highlight && value > 0 ? "border-amber-300 bg-amber-50" : "border-neutral-200"
      }`}
    >
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
      {sublabel && <div className="mt-1 text-[10px] text-amber-700">{sublabel}</div>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
