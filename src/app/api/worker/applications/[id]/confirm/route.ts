import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/guard";
import { assertApplicationTransition } from "@/server/jobs/state-machine";
import { syncJobHeadcountStatus } from "@/server/jobs/headcount";
import { hasSchedulingConflict } from "@/server/matching/build-candidate";
import { logAudit } from "@/server/audit/log";

// The worker's own acceptance of an offer (blueprint §29: "Get selected ->
// Confirm assignment"). This is the moment an Assignment actually gets
// created — an Application reaching SELECTED never guarantees a position,
// only CONFIRMED does.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("WORKER");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const application = await db.application.findUnique({
    where: { id },
    include: { job: true, worker: { select: { userId: true } } },
  });
  if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  if (application.worker.userId !== auth.session.userId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  try {
    assertApplicationTransition(application.status, "CONFIRMED");
  } catch {
    return NextResponse.json(
      { error: "This offer is no longer available to confirm." },
      { status: 400 },
    );
  }

  // Hard block even though selection already soft-checks this — a worker
  // could hold two simultaneous SELECTED offers and only one can become a
  // real, non-overlapping Assignment (§28).
  const conflict = await hasSchedulingConflict(db, application.workerProfileId, application.job);
  if (conflict) {
    return NextResponse.json(
      { error: "You already have a confirmed job that overlaps this one." },
      { status: 400 },
    );
  }

  const assignment = await db.$transaction(async (tx) => {
    await tx.application.update({ where: { id }, data: { status: "CONFIRMED" } });
    const created = await tx.assignment.create({
      data: {
        applicationId: id,
        jobId: application.jobId,
        workerProfileId: application.workerProfileId,
        status: "CONFIRMED",
      },
    });
    await tx.attendance.create({ data: { assignmentId: created.id, status: "PENDING" } });
    await syncJobHeadcountStatus(tx, application.jobId);
    return created;
  });

  await logAudit({
    actorUserId: auth.session.userId,
    action: "ASSIGNMENT_CONFIRMED",
    targetType: "Assignment",
    targetId: assignment.id,
  });

  return NextResponse.json({ ok: true, assignment });
}
