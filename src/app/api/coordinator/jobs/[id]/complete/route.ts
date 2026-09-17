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

  const assignments = await db.assignment.findMany({
    where: { jobId: id, status: "CONFIRMED" },
    include: { attendance: true },
  });

  await db.$transaction(async (tx) => {
    for (const assignment of assignments) {
      const attended = assignment.attendance?.status === "PRESENT" || assignment.attendance?.status === "LATE";

      if (attended) {
        await tx.assignment.update({ where: { id: assignment.id }, data: { status: "COMPLETED" } });
        await tx.application.update({ where: { id: assignment.applicationId }, data: { status: "COMPLETED" } });
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
      } else {
        await tx.assignment.update({ where: { id: assignment.id }, data: { status: "NO_SHOW" } });
        await tx.application.update({ where: { id: assignment.applicationId }, data: { status: "NO_SHOW" } });
        if (assignment.attendance && assignment.attendance.status !== "ABSENT") {
          await tx.attendance.update({
            where: { id: assignment.attendance.id },
            data: { status: "ABSENT", markedByUserId: auth.session.userId, markedAt: new Date() },
          });
        }
      }
    }
    await tx.job.update({ where: { id }, data: { status: "COMPLETED" } });
  });

  await logAudit({
    actorUserId: auth.session.userId,
    action: "JOB_COMPLETED",
    targetType: "Job",
    targetId: id,
    metadata: { assignmentsFinalized: assignments.length },
  });

  return NextResponse.json({ ok: true });
}
