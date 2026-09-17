import { db } from "@/server/db";

// Work history is derived, never stored (decision from Phase 1) — this is
// the one place that derivation happens, so the worker dashboard and any
// future coordinator "view worker" screen read the same numbers.
export async function getWorkHistorySummary(workerProfileId: string) {
  const assignments = await db.assignment.findMany({
    where: { workerProfileId, status: { in: ["COMPLETED", "NO_SHOW"] } },
    include: { job: { select: { title: true, category: true, date: true } } },
    orderBy: { confirmedAt: "desc" },
  });

  const completed = assignments.filter((a) => a.status === "COMPLETED");
  const noShow = assignments.filter((a) => a.status === "NO_SHOW");

  const byCategory: Partial<Record<string, number>> = {};
  for (const a of completed) {
    byCategory[a.job.category] = (byCategory[a.job.category] ?? 0) + 1;
  }

  const totalMarked = completed.length + noShow.length;

  const payments = await db.payment.findMany({
    where: { assignment: { workerProfileId } },
    select: { workerPayAmount: true, workerPaymentStatus: true },
  });
  const totalEarned = payments.reduce((sum, p) => sum + Number(p.workerPayAmount), 0);
  const totalPaidOut = payments
    .filter((p) => p.workerPaymentStatus === "PAID")
    .reduce((sum, p) => sum + Number(p.workerPayAmount), 0);

  return {
    completedCount: completed.length,
    noShowCount: noShow.length,
    attendanceRate: totalMarked === 0 ? null : completed.length / totalMarked,
    byCategory,
    totalEarned,
    totalPaidOut,
    recent: assignments.slice(0, 5),
  };
}

export type WorkHistorySummary = Awaited<ReturnType<typeof getWorkHistorySummary>>;
