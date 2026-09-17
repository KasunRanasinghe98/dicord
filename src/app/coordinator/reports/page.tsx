import Link from "next/link";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export default async function CoordinatorReportsPage() {
  const [
    totalJobs,
    completedJobs,
    cancelledJobs,
    completedAssignments,
    noShowAssignments,
    cancelledAssignments,
    totalEverConfirmedAssignments,
    payments,
    registeredWorkers,
    verifiedWorkers,
    registeredEmployers,
    verifiedEmployers,
  ] = await Promise.all([
    db.job.count({ where: { status: { not: "DRAFT" } } }),
    db.job.count({ where: { status: "COMPLETED" } }),
    db.job.count({ where: { status: "CANCELLED" } }),
    db.assignment.count({ where: { status: "COMPLETED" } }),
    db.assignment.count({ where: { status: "NO_SHOW" } }),
    db.assignment.count({ where: { status: "CANCELLED" } }),
    db.assignment.count(),
    db.payment.findMany({ select: { platformFeeAmount: true, employerPaymentStatus: true } }),
    db.workerProfile.count(),
    db.workerProfile.count({ where: { verificationStatus: "VERIFIED" } }),
    db.employerProfile.count(),
    db.employerProfile.count({ where: { verificationStatus: "VERIFIED" } }),
  ]);

  const feesEarned = payments.reduce((sum, p) => sum + Number(p.platformFeeAmount), 0);
  const feesCollected = payments
    .filter((p) => p.employerPaymentStatus === "PAID")
    .reduce((sum, p) => sum + Number(p.platformFeeAmount), 0);
  const pendingPaymentCount = payments.filter((p) => p.employerPaymentStatus !== "PAID").length;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Reports</h1>
        <Link href="/coordinator" className="text-xs text-neutral-500 underline">
          Back to dashboard
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">
          Real jobs completed — the metric that matters most this early
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Metric label="Jobs completed" value={`${completedJobs} / ${totalJobs}`} sub={pct(completedJobs, totalJobs)} />
          <Metric label="Jobs cancelled" value={`${cancelledJobs} / ${totalJobs}`} sub={pct(cancelledJobs, totalJobs)} />
          <Metric label="Worker-shifts completed" value={String(completedAssignments)} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Reliability</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Metric
            label="No-show rate"
            value={pct(noShowAssignments, completedAssignments + noShowAssignments)}
            sub={`${noShowAssignments} no-shows`}
          />
          <Metric
            label="Cancellation rate"
            value={pct(cancelledAssignments, totalEverConfirmedAssignments)}
            sub={`${cancelledAssignments} cancelled assignments`}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Payments</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Metric label="Platform fees earned" value={`Rs. ${feesEarned.toFixed(2)}`} />
          <Metric label="Platform fees collected" value={`Rs. ${feesCollected.toFixed(2)}`} />
          <Metric
            label="Payments pending"
            value={String(pendingPaymentCount)}
            href="/coordinator/payments"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">People</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Metric label="Workers" value={String(registeredWorkers)} sub={`${verifiedWorkers} verified`} href="/coordinator/workers" />
          <Metric label="Employers" value={String(registeredEmployers)} sub={`${verifiedEmployers} verified`} href="/coordinator/employers" />
        </div>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-lg border border-neutral-200 p-4 text-center">
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
      {sub && <div className="mt-1 text-[10px] text-neutral-400">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
