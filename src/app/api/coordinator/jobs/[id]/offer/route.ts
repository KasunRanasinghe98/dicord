import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/guard";
import { isOpenForApplications } from "@/server/jobs/state-machine";
import { hasSchedulingConflict } from "@/server/matching/build-candidate";
import { logAudit } from "@/server/audit/log";

const bodySchema = z.object({ workerProfileId: z.string().min(1) });

// Directly offers the job to a worker who never applied — the replacement
// path (blueprint §14). Reuses the same SELECTED-then-worker-confirms
// mechanism as a normal applicant selection, just without an APPLIED step
// first, so everything downstream (confirm/decline/assignment) is identical.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("COORDINATOR", "ADMIN");
  if ("error" in auth) return auth.error;

  const { id: jobId } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  if (!isOpenForApplications(job.status)) {
    return NextResponse.json({ error: "This job is not open for new offers." }, { status: 400 });
  }

  const workerProfile = await db.workerProfile.findUnique({
    where: { id: parsed.data.workerProfileId },
  });
  if (!workerProfile) return NextResponse.json({ error: "Worker not found." }, { status: 404 });

  const existing = await db.application.findUnique({
    where: { jobId_workerProfileId: { jobId, workerProfileId: workerProfile.id } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "This worker already has an application for this job — select it directly instead." },
      { status: 409 },
    );
  }

  const conflict = await hasSchedulingConflict(db, workerProfile.id, job);
  if (conflict) {
    return NextResponse.json(
      { error: "This worker already has a confirmed job that overlaps this one." },
      { status: 400 },
    );
  }

  const application = await db.application.create({
    data: {
      jobId,
      workerProfileId: workerProfile.id,
      status: "SELECTED",
      decidedAt: new Date(),
      decidedByUserId: auth.session.userId,
    },
  });

  await db.notification.create({
    data: {
      userId: workerProfile.userId,
      type: "REPLACEMENT_OPPORTUNITY",
      title: "New job opportunity",
      body: `You've been offered a position for "${job.title}". Confirm to accept.`,
      relatedJobId: jobId,
    },
  });

  await logAudit({
    actorUserId: auth.session.userId,
    action: "JOB_OFFERED_DIRECTLY",
    targetType: "Application",
    targetId: application.id,
    metadata: { jobId, workerProfileId: workerProfile.id },
  });

  return NextResponse.json({ ok: true, application });
}
