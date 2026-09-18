import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/guard";
import { assertJobTransition } from "@/server/jobs/state-machine";
import { getPlatformFeePerWorker } from "@/lib/config";
import { logAudit } from "@/server/audit/log";

// The one place Application/Assignment status gets finalized based on
// attendance (blueprint §16, §28: "a completed assignment should count
// toward work history", "a no-show should be recorded"). Attendance
// marking itself (.../assignments/[id]/attendance) only records the raw
// fact — this route is what turns that fact into history.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("COORDINATOR", "ADMIN");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const job = await db.job.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

  try {
    assertJobTransition(job.status, "COMPLETED");
  } catch {
    return NextResponse.json({ error: "Only an in-progress job can be completed." }, { status: 400 });
  }

  const finalizedCount = await db.$transaction(async (tx) => {
    // Read and write inside the same transaction, with a status-guarded
    // update: a worker cancelling their assignment concurrently (between
    // this read and this write) would otherwise let a CANCELLED assignment
    // get silently flipped to COMPLETED and paid — a real money-touching
    // race, not just a theoretical one.
    const assignments = await tx.assignment.findMany({
      where: { jobId: id, status: "CONFIRMED" },
      include: { attendance: true },
    });

    let finalized = 0;
    for (const assignment of assignments) {
      const attended = assignment.attendance?.status === "PRESENT" || assignment.attendance?.status === "LATE";
      const targetStatus = attended ? "COMPLETED" : "NO_SHOW";

      const { count } = await tx.assignment.updateMany({
        where: { id: assignment.id, status: "CONFIRMED" },
        data: { status: targetStatus },
      });
      if (count === 0) continue; // status changed since the read above — skip it

      await tx.application.update({ where: { id: assignment.applicationId }, data: { status: targetStatus } });

      if (attended) {
        // Blueprint §18: a "successful hire" is a worker who was assigned
        // and completed the shift — a NO_SHOW never generates a Payment.
        // The fee is a snapshot of the configured rate at completion time,
        // not a live reference, so past records don't shift if the rate
        // changes later.
        await tx.payment.create({
          data: {
            jobId: id,
            assignmentId: assignment.id,
            workerPayAmount: job.payPerWorker,
            platformFeeAmount: getPlatformFeePerWorker(),
          },
        });
      } else if (assignment.attendance && assignment.attendance.status !== "ABSENT") {
        await tx.attendance.update({
          where: { id: assignment.attendance.id },
          data: { status: "ABSENT", markedByUserId: auth.session.userId, markedAt: new Date() },
        });
      }
      finalized += 1;
    }

    await tx.job.update({ where: { id }, data: { status: "COMPLETED" } });
    return finalized;
  });

  await logAudit({
    actorUserId: auth.session.userId,
    action: "JOB_COMPLETED",
    targetType: "Job",
    targetId: id,
    metadata: { assignmentsFinalized: finalizedCount },
  });

  return NextResponse.json({ ok: true });
}
