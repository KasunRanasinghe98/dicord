import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/guard";
import { isOpenForApplications } from "@/server/jobs/state-machine";
import { logAudit } from "@/server/audit/log";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("WORKER");
  if ("error" in auth) return auth.error;

  const { id: jobId } = await params;

  const workerProfile = await db.workerProfile.findUnique({
    where: { userId: auth.session.userId },
  });
  if (!workerProfile) {
    return NextResponse.json(
      { error: "Complete your profile before applying to jobs." },
      { status: 400 },
    );
  }

  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }
  if (!isOpenForApplications(job.status)) {
    return NextResponse.json(
      { error: "This job is no longer accepting applications." },
      { status: 400 },
    );
  }
  if (job.applicationDeadline && job.applicationDeadline < new Date()) {
    return NextResponse.json(
      { error: "The application deadline for this job has passed." },
      { status: 400 },
    );
  }

  try {
    const application = await db.application.create({
      data: { jobId, workerProfileId: workerProfile.id },
    });
    await logAudit({
      actorUserId: auth.session.userId,
      action: "APPLICATION_CREATED",
      targetType: "Application",
      targetId: application.id,
      metadata: { jobId },
    });
    return NextResponse.json({ ok: true, application });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "You already applied to this job." },
        { status: 409 },
      );
    }
    throw err;
  }
}
