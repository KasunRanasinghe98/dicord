import Link from "next/link";
import { db } from "@/server/db";
import { ActionButton } from "@/app/action-button";

export const dynamic = "force-dynamic";

export default async function CoordinatorPaymentsPage() {
  const payments = await db.payment.findMany({
    include: {
      job: { select: { title: true, employer: { select: { businessName: true } } } },
      assignment: { select: { worker: { select: { fullName: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const pendingCount = payments.filter(
    (p) => p.employerPaymentStatus === "PENDING" || p.workerPaymentStatus === "PENDING",
  ).length;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Payments</h1>
        <Link href="/coordinator" className="text-xs text-neutral-500 underline">
          Back to dashboard
        </Link>
      </div>

      <p className="text-sm text-neutral-500">
        {pendingCount} of {payments.length} payment{payments.length === 1 ? "" : "s"} still have
        something pending.
      </p>

      <div className="space-y-3">
        {payments.length === 0 && (
          <p className="text-sm text-neutral-400">
            No payments yet — these appear once a job is marked completed.
          </p>
        )}
        {payments.map((p) => (
          <div key={p.id} className="rounded-lg border border-neutral-200 p-4">
            <h3 className="text-sm font-semibold">{p.job.title}</h3>
            <p className="text-xs text-neutral-500">
              {p.assignment.worker.fullName} · {p.job.employer.businessName}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-neutral-600">
              <div>
                Worker pay: Rs. {p.workerPayAmount.toString()}
                <div className="mt-1">
                  {p.workerPaymentStatus === "PAID" ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                      Paid
                    </span>
                  ) : (
                    <ActionButton
                      endpoint={`/api/coordinator/payments/${p.id}/mark-worker-paid`}
                      label="Mark worker paid"
                      pendingLabel="Saving..."
                      variant="primary"
                    />
                  )}
                </div>
              </div>
              <div>
                Platform fee: Rs. {p.platformFeeAmount.toString()}
                <div className="mt-1">
                  {p.employerPaymentStatus === "PAID" ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                      Paid
                    </span>
                  ) : (
                    <ActionButton
                      endpoint={`/api/coordinator/payments/${p.id}/mark-employer-paid`}
                      label="Mark employer paid"
                      pendingLabel="Saving..."
                      variant="primary"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
