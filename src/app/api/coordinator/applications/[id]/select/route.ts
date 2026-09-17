import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/guard";
import { assertApplicationTransition } from "@/server/jobs/state-machine";
import { hasSchedulingConflict } from "@/server/matching/build-candidate";
import { logAudit } from "@/server/audit/log";

// Selecting an applicant notifies the worker and waits for them to accept
// (confirm) or decline — it does NOT create an Assignment yet. Blueprint
// §12: "Applied" is not "Assigned".
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("COORDINATOR", "ADMIN");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const application = await db.application.findUnique({
    where: { id },
    include: { job: true, worker: { select: { userId: true } } },
  });
  if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  try {
    assertApplicationTransition(application.status, "SELECTED");
  } catch {
    return NextResponse.json(
      { error: "This application can no longer be selected." },
      { status: 400 },
    );
  }

  const conflict = await hasSchedulingConflict(db, application.workerProfileId, application.job);
  if (conflict) {
    return NextResponse.json(
      { error: "This worker already has a confirmed job that overlaps this one." },
      { status: 400 },
    );
  }

  const updated = await db.application.update({
    where: { id },
    data: { status: "SELECTED", decidedAt: new Date(), decidedByUserId: auth.session.userId },
  });

  await db.notification.create({
    data: {
      userId: application.worker.userId,
      type: "SELECTED",
      title: "You've been selected!",
      body: `You were selected for "${application.job.title}". Confirm to accept the position.`,
      relatedJobId: application.jobId,
    },
  });

  await logAudit({
    actorUserId: auth.session.userId,
    action: "APPLICATION_SELECTED",
    targetType: "Application",
    targetId: id,
  });

  return NextResponse.json({ ok: true, application: updated });
}
