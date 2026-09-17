import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/guard";
import { assertJobTransition } from "@/server/jobs/state-machine";
import { logAudit } from "@/server/audit/log";

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
    assertJobTransition(job.status, "OPEN");
  } catch {
    return NextResponse.json(
      { error: "Only jobs pending approval can be approved." },
      { status: 400 },
    );
  }

  const updated = await db.job.update({
    where: { id },
    data: { status: "OPEN", approvedByUserId: auth.session.userId, approvedAt: new Date() },
  });

  await logAudit({
    actorUserId: auth.session.userId,
    action: "JOB_APPROVED",
    targetType: "Job",
    targetId: id,
  });

  return NextResponse.json({ ok: true, job: updated });
}
